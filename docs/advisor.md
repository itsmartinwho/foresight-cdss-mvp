# Advisor Guide

This document provides a guide to the Advisor feature (tool A), including its integration with OpenAI's Code Interpreter for data analysis and visualization.

## Overview

The Advisor is an AI-powered chatbot that provides general medical information and allows users to ask questions based on attached patient data. It uses OpenAI's models to provide answers and can generate charts and tables to visualize data.

### Key Features

- **AI-Powered Chat**: Utilizes OpenAI models (e.g., `gpt-4.1-mini`) for medical queries.
- **Patient Context**: Can answer questions based on the data of a selected patient.
- **Code Interpreter Integration**: Uses OpenAI's Code Interpreter to automatically generate charts and tables for data analysis.
- **Streaming Responses**: Text responses are streamed to the user for a real-time experience.

## Code Interpreter Integration

The system uses OpenAI's Assistants API with the Code Interpreter tool for all medical data analysis and visualization.

### How It Works

1.  **Patient Context**: When a patient is selected, their clinical data is fetched.
2.  **Assistant Analysis**: A dedicated OpenAI Assistant analyzes the data.
3.  **Proactive Visualization**: The assistant proactively creates charts and tables for time-series data, comparisons, or clinical trends.
4.  **Simulated Streaming**: Text responses are streamed, and chart loading placeholders are displayed.
5.  **Result Display**: The final charts and tables are rendered in the chat interface.

### API Endpoints

-   **`GET /api/advisor/image/[fileId]`**: Serves images generated by the Code Interpreter.

### Event Types

The Advisor handles several server-sent event types:
- `markdown_chunk`: Text content from the assistant.
- `code_interpreter_code`: Python code that was executed.
- `code_interpreter_output`: Text output from code execution.
- `code_interpreter_image`: The file ID for a generated chart.

### Environment Variables

To use the Code Interpreter integration, you need to set the following environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key_here
MEDICAL_ADVISOR_ASSISTANT_ID=asst_your_advisor_assistant_id
CLINICAL_ENGINE_ASSISTANT_ID=asst_your_clinical_engine_assistant_id
```

## Roadmap and Future Enhancements

- **Full Chart Visualization**: The current implementation generates the code for charts and renders them but charts could be impproved.
- **Interactive Charts**: Future versions may include support for interactive charts.
- **Real-time Progress**: The system may be enhanced to show the real-time progress of chart generation.

## Troubleshooting

- **Assistant Creation**: If assistant IDs are not provided in the environment variables, the system will create new ones and log their IDs to the console.
- **Image Loading Issues**: If charts do not display, check the browser console for errors and verify your OpenAI API key has the correct permissions. 