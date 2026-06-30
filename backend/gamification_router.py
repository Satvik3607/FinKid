import os
import json
from typing import Any, Dict, List, Optional, cast
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from datetime import datetime, timezone

from backend.auth import get_current_user_id

router = APIRouter(prefix="/api/gamification", tags=["gamification"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing Supabase credentials for gamification router")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Load static data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "finkid_gamification.json"), "r", encoding="utf-8") as f:
    GAMIFICATION_DATA = json.load(f)

with open(os.path.join(BASE_DIR, "finkid_courses.json"), "r", encoding="utf-8") as f:
    COURSES_DATA = json.load(f)

class CompleteLessonRequest(BaseModel):
    course_id: str
    lesson_id: str
    quiz_answer_idx: Optional[int] = None
    quiz_answer_text: Optional[str] = None

class CompleteLessonResponse(BaseModel):
    success: bool
    points_earned: int
    new_level: Optional[str] = None
    newly_earned_badges: List[dict] = []
    quiz_feedback: Optional[str] = None
    is_correct: Optional[bool] = None

@router.post("/complete-lesson", response_model=CompleteLessonResponse)
async def complete_lesson(req: CompleteLessonRequest, user_id: str = Depends(get_current_user_id)):
    # 1. Verify the course and lesson exist
    course = next((c for c in COURSES_DATA["courses"] if c["id"] == req.course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    lesson = next((l for l in course["lessons"] if l["id"] == req.lesson_id), None)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # 2. Check if already completed
    prog_res = supabase_client.table("course_progress").select("*").eq("user_id", user_id).eq("course_id", req.course_id).eq("lesson_id", req.lesson_id).execute()
    if prog_res.data:
        return CompleteLessonResponse(
            success=True,
            points_earned=0,
            quiz_feedback="You've already completed this lesson!",
            is_correct=True
        )

    points_to_award = GAMIFICATION_DATA["points"]["lesson_complete"]
    quiz_data = GAMIFICATION_DATA["lesson_quizzes"].get(req.lesson_id)
    
    quiz_feedback = None
    is_correct = None
    quiz_correct_increment = 0

    if quiz_data:
        if quiz_data["type"] == "mc":
            if req.quiz_answer_idx is not None and req.quiz_answer_idx == quiz_data["correct_index"]:
                points_to_award += GAMIFICATION_DATA["points"]["quiz_correct"]
                is_correct = True
                quiz_feedback = "Correct! Great job."
                quiz_correct_increment = 1
            else:
                is_correct = False
                correct_ans = quiz_data["options"][quiz_data["correct_index"]]
                quiz_feedback = f"Not quite! The correct answer was: {correct_ans}"
        elif quiz_data["type"] == "reflection":
            if req.quiz_answer_text and req.quiz_answer_text.strip():
                points_to_award += GAMIFICATION_DATA["points"]["reflection_complete"]
                is_correct = True
                quiz_feedback = "Thanks for sharing your reflection!"
            else:
                is_correct = False
                quiz_feedback = "Please write a reflection to earn points."

    # Save to course_progress
    supabase_client.table("course_progress").insert({
        "user_id": user_id,
        "course_id": req.course_id,
        "lesson_id": req.lesson_id
    }).execute()

    # Check for course complete bonus
    all_prog_res = supabase_client.table("course_progress").select("lesson_id").eq("user_id", user_id).eq("course_id", req.course_id).execute()
    completed_lessons_in_course = set([cast(Dict[str, Any], p)["lesson_id"] for p in all_prog_res.data])
    course_lesson_ids = set([l["id"] for l in course["lessons"]])
    
    if course_lesson_ids.issubset(completed_lessons_in_course):
        points_to_award += GAMIFICATION_DATA["points"]["course_complete_bonus"]

    # 3. Upsert user stats
    stats_res = supabase_client.table("user_stats").select("*").eq("user_id", user_id).execute()
    
    current_stats = {
        "total_points": 0,
        "current_level": "Money Newbie",
        "badges_earned": [],
        "quiz_correct_count": 0
    }
    
    is_new_stats = True
    if stats_res.data:
        current_stats = cast(Dict[str, Any], stats_res.data[0])
        is_new_stats = False

    new_total_points = current_stats["total_points"] + points_to_award
    new_quiz_correct_count = cast(int, current_stats.get("quiz_correct_count", 0)) + quiz_correct_increment
    earned_badges = cast(list, current_stats.get("badges_earned", []))

    # Calculate level
    new_level: str = cast(str, current_stats["current_level"])
    level_changed = False
    
    sorted_levels = sorted(GAMIFICATION_DATA["levels"], key=lambda x: x["min_points"], reverse=True)
    for lvl in sorted_levels:
        if new_total_points >= lvl["min_points"]:
            if new_level != lvl["name"]:
                new_level = lvl["name"]
                level_changed = True
            break

    # Calculate badges
    newly_earned = []
    
    all_user_prog = supabase_client.table("course_progress").select("*").eq("user_id", user_id).execute()
    completed_all_time = all_user_prog.data
    
    def award_badge(badge_id):
        if badge_id not in earned_badges:
            earned_badges.append(badge_id)
            badge_info = next((b for b in GAMIFICATION_DATA["badges"] if b["id"] == badge_id), None)
            if badge_info:
                newly_earned.append(badge_info)

    if len(completed_all_time) >= 1:
        award_badge("first_step")
        
    if course_lesson_ids.issubset(completed_lessons_in_course):
        award_badge("course_crusher")

    if new_quiz_correct_count >= 10:
        award_badge("quiz_master")

    completed_courses = set([cast(Dict[str, Any], p)["course_id"] for p in completed_all_time])
    total_courses = set([c["id"] for c in COURSES_DATA["courses"]])
    if total_courses.issubset(completed_courses):
        award_badge("all_rounder")
        
    days_set = set()
    for p in completed_all_time:
        d = cast(Dict[str, Any], p)
        if "completed_at" in d:
            dt = datetime.fromisoformat(d["completed_at"].replace('Z', '+00:00'))
            days_set.add(dt.strftime("%Y-%m-%d"))
    
    if len(days_set) >= 3:
        award_badge("streak_starter")

    # Save to db
    if is_new_stats:
        supabase_client.table("user_stats").insert({
            "user_id": user_id,
            "total_points": new_total_points,
            "current_level": new_level,
            "badges_earned": earned_badges,
            "quiz_correct_count": new_quiz_correct_count
        }).execute()
    else:
        supabase_client.table("user_stats").update({
            "total_points": new_total_points,
            "current_level": new_level,
            "badges_earned": earned_badges,
            "quiz_correct_count": new_quiz_correct_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("user_id", user_id).execute()

    return CompleteLessonResponse(
        success=True,
        points_earned=points_to_award,
        new_level=new_level if level_changed else None,
        newly_earned_badges=newly_earned,
        quiz_feedback=quiz_feedback,
        is_correct=is_correct
    )
