# Shared Data Assets Directory

This directory stores raw reference materials used by the RAG ingestion pipeline:

## Folder Structure

Please place your raw documents here:
- **PDF Books**: Put your financial literacy books (e.g., `The_Simple_Path_to_Wealth.pdf`) here.
- **Kaggle Datasets**: Save any downloaded CSV spreadsheets or datasets in this directory.

## File Naming Recommendations
To ensure the ingestion scripts work seamlessly:
1. Try to keep filenames simple, avoiding spaces (e.g. use `simple_path_to_wealth.pdf` or `finance_stats.csv`).
2. Make sure file paths are configured correctly in the backend ingestion script configuration variables.
