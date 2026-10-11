# Parallel Universe Simulator

Note: This project is a work in progress, with ongoing feature development and improvements.

## Project Overview

The Parallel Universe Simulator is an AI-powered application for exploring alternate realities. By branching off from any point in Earth’s timeline, you can create unique “what if” scenarios, see every universe side by side on a shared time axis, and read any universe's history as a diary.

## Features

* AI-Powered Divergence: Ask a “what if” question and the AI writes the next event, using the recent history of the universe so it stays consistent. Every request is moderated and checked on the server before anything is generated.
* Preview Before Saving: AI events appear as a preview you can save, edit or try again. Your own events can be edited later.
* Bring Your Own Key: Anyone can add their own OpenAI API key from the "AI" button in the header. It is checked with OpenAI first, kept in the browser (for the session, or on the device if you choose), and sent to the app's server only with AI requests. It is never stored on the server, in saved universes or in exports.
* Write It Yourself: No OpenAI API key? Write the title, date and description of each event by hand. With a key, you can switch between generating and writing.
* Terminal Look: The whole app is styled as an old green-screen terminal, with VT323 for headings, controls and chart labels and IBM Plex Mono for text.
* Universe Colours: Pick a colour for any universe from a palette where every colour passes WCAG AAA contrast (7:1) on the dark screen. The chart and sidebar use it. The log stays all green, with a small square in each universe's colour beside its name.
* Logic Check: With AI available, ask for an optional check of any event or draft: does the timing make sense, and does it follow from where the universe split off? It returns a verdict, notes and suggestions, and changes nothing.
* Swimlane Chart: Each universe is a lane on a shared time axis, with a dashed line from where it branches off. Click an event (or tab to it and press Enter) to select it.
* Branch or Continue: From any event, branch into a new universe or continue the universe it belongs to. The prime universe stays as it is.
* Inherited History: Viewing a universe shows its own events plus everything it inherits from the universes it branched from, up to each fork point.
* The Log: Read any universe as a log on an old green-screen terminal, scrolling from top to bottom, with sections by decade, an index, a divergence alert where the universe splits off, and a GOTO YEAR command line. It reopens where you left off and prints or saves as a PDF.
* Personal Logs: With an API key, the AI retells each event in the first person the first time its record scrolls into view, types it out and saves it. Without one, you can write the logs yourself.
* Safe Deleting with Undo: Delete your own events and universes, and undo straight after. Deleting a universe also removes every universe that branches from it.
* Export and Import: Save everything you made as a JSON file and load it in another browser.

## Project Structure

Built with Next.js and TypeScript, the project follows atomic design principles.

* `src/utils/timelineGraph.ts`: the branching model as pure, unit-tested functions.
* `src/utils/book.ts`: turns a universe's history into the records of its log.
* `src/utils/swimlaneLayout.ts`: places events on the chart's time axis.
* `src/utils/storage.ts`: what is saved, loading older saves, export and import.
* `src/store/universeStore.ts`: app state (Zustand), saved to local storage.
* `src/app/api/generate`: moderation, intent check and generation in one route.
* `src/app/api/journal`: personal logs for the log view.

## How It Works

1.	The app opens on the prime universe (universe 1, real recorded history). Pick another universe from the sidebar, or “All universes”.
2.	Select an event on the chart.
3.	Choose “Branch into a new universe” or “Continue this universe”.
4.	Ask a “what if” question, or write the event yourself.
5.	Check the AI's preview, then save it, edit it or try again.
6.	Press “Open log” to read the universe's history on the terminal.

## Branching Model

Universes form a tree. The logic lives in `src/utils/timelineGraph.ts` as pure, unit-tested functions.

* **Fork point**: a branched universe starts with a `Splinter` event whose `parentID` is the event it diverged from. That event is the universe's fork point.
* **Inheritance**: a universe shares everything in its parent up to and including the fork point (`getTimelineHistory`, `getLineage`). Events after the fork belong to the parent only.
* **Ordering**: dates are compared with `toSortKey`, which copes with partial dates (`1969`), free text (`1945-08-06 and 1945-08-09`) and undated events (sorted last). Universes are listed parents-first (`orderTimelines`).
* **Validation**: a new event must be dated on or after the event it branches from or continues (`validateNewEvent`). Edits keep an event after its universe begins and before any universe that branches from it (`editEvent`).
* **Deleting**: built-in events and universes from `timelines.json` can't be deleted. An event that another universe branches from, or the event a universe begins with, can't be deleted on its own (`getEventDeleteBlocker`). Deleting a universe removes its descendants (`deleteTimeline`).

## Saved Data

Only what you make is saved, under the `parallel-universes` key in local storage. Built-in universes come from `timelines.json` on every load, so updates to that file reach everyone. Saves from older versions (the `events` key) are read automatically the first time and left in place.

## Installation

Requires Node.js 24 or later (see `.nvmrc`).

1.	Clone the repository:
    ```
    git clone git@github.com:anthonybellon/ParallelUniverses.git
    ```
2.	Install dependencies:
    ```
    cd ParallelUniverses
    npm install
    ```
3.	Set up environment variables (optional):
The app runs without any keys. You write events yourself and everything is saved in your browser. Each person can add their own OpenAI key in the app. To give the app a key of its own instead, create a .env.local file and add it:
    ```
    OPENAI_API_KEY= # OpenAI API Key
    OPENAI_MODEL=   # Optional, defaults to gpt-4o-mini
    ```
4.	Run the development server:
    ```
    npm run dev
    ```
5.	Open the application at http://localhost:3000 to explore the Parallel Universe Simulator.

## Testing

```
npm run lint        # ESLint 9
npm run typecheck   # TypeScript
npm test            # unit and component tests (Jest)
npm run test:e2e    # end-to-end tests (Playwright)
```

Run `npx playwright install chromium` once before the end-to-end tests. They mock the AI routes, so no API key is used. The pre-commit hook runs lint, the type check and the unit tests.

## Roadmap

* Branch Diff View: Compare two universes side by side and see what changed after their fork point.
* AI Response Customization: Allow users to adjust the tone and style of AI-generated responses.
* Accounts and Sync: Keep universes in the cloud as well as in the browser.
* Extended Timeline Range: Support additional historical periods beyond the current 1900-to-present day focus.
