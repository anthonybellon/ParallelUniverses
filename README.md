# Parallel Universe Simulator

Note: This project is a work in progress, with ongoing feature development and improvements.

## Project Overview

The Parallel Universe Simulator is an AI-powered application for exploring alternate realities. By branching off from any point in Earth’s timeline, you can create unique “what if” scenarios and visualize these timelines individually or collectively. This provides a dynamic way to explore alternate histories.

## Features

    •	AI-Powered Divergence: Use ChatGPT to create divergent historical events based on your specific “what if” scenarios.
    •	Interactive Timeline Visualization: Visualize timelines in a collapsible tree format using ECharts, organized chronologically for easy exploration.
    •	Multiple Timeline Management: Create, manage, and explore parallel timelines, each with its own unique set of events.
    •	Dynamic Event Creation: Add events at any point in a timeline or start new splintered timelines from existing events.

## Project Structure

Built with Next.js and TypeScript, the project follows atomic design principles. Timeline data is stored locally in JSON format, managed through helper functions to handle reading, writing, and chronological organization.

## How It Works

    1.	Select a Timeline: Choose an existing timeline to explore.
    2.	Pick an Event: Select a specific event where you want to branch off.
    3.	Create Alternate Histories: Input your “what if” scenario.
    4.	Decide the Path: Choose to either splinter into a new universe or continue the existing one.
    5.	Generate an Alternate History: The AI crafts a new alternate history based on your input.
    6.	Visualize and Explore: View and compare your alternate histories within a collapsible timeline.

## Installation

    1.	Clone the repository:

git clone git@github.com:anthonybellon/ParallelUniverses.git

    2.	Install dependencies:

cd ParallelUniverses
npm install

    3.	Set up environment variables:

Create a .env.local file and add your OpenAI API key:
OPENAI_API_KEY= # OpenAI API Key

    4.	Run the development server:

npm run dev

    5.	Open the application at http://localhost:3000 to explore the Parallel Universe Simulator.

## Roadmap

    •	AI Response Customization: Allow users to adjust the tone and style of AI-generated responses.
    •	Firebase Integration: Expand storage options beyond local storage.
    •	Extended Timeline Range: Support additional historical periods beyond the current 1900-to-present day focus.
    •	Enhanced Visualization Options: Include 3D visualization or geospatial views for richer exploration.
