'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowLeft, Sparkles } from 'lucide-react';

const faqs = [
  {
    question: "What is FinKid?",
    answer: "FinKid is an interactive, AI-powered tutor designed to help kids and teens learn about personal finance, saving, investing, and more, all in a fun and encouraging way."
  },
  {
    question: "Is my information safe?",
    answer: "Yes! We take your privacy very seriously. We don't ask for sensitive financial information like bank account numbers or social security numbers. Everything you learn with FinKid stays between you and your tutor."
  },
  {
    question: "Can FinKid give investment advice?",
    answer: "No. FinKid is designed for general education only. It cannot give you personalized investment advice, tell you what specific stocks to buy, or recommend financial products. Always talk to a trusted adult or professional for real financial decisions."
  },
  {
    question: "How do I track my progress?",
    answer: "You can track your progress by visiting the 'Courses' and 'Profile' pages. As you learn and chat, you'll earn points, level up, and collect badges!"
  },
  {
    question: "What if FinKid doesn't know the answer?",
    answer: "If FinKid doesn't have the answer in its learning materials, it will honestly tell you so. You can always ask a parent, teacher, or trusted adult for help with things FinKid isn't sure about."
  },
  {
    question: "How much does it cost?",
    answer: "FinKid is currently free to use as an educational tool."
  },
  {
    question: "Who is FinKid for?",
    answer: "FinKid is primarily built for kids and teens ages 8-16, but anyone who wants to learn the basics of money management in a friendly way is welcome!"
  },
  {
    question: "How do I report a problem?",
    answer: "If you run into any issues or just want to tell us how we're doing, you can use the 'Feedback' link at the top of the chat page to send us a message."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/chat" className="flex items-center text-brand-600 hover:text-brand-800 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Back to Chat
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <span className="font-heading font-extrabold text-xl text-brand-600">FinKid</span>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500 mb-8">Got questions? We've got answers. Learn more about how FinKid works.</p>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full text-left px-6 py-4 flex justify-between items-center focus:outline-none focus:bg-gray-50 hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown 
                    size={20} 
                    className={`text-gray-400 transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {openIndex === index && (
                  <div className="px-6 pb-4 pt-0 text-gray-600 leading-relaxed bg-gray-50">
                    <div className="h-px w-full bg-gray-200 mb-4"></div>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
