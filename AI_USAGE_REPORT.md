# AI Usage Report

## How AI assisted

AI was used throughout the Strex project for planning, source-code generation, debugging, code review, testing guidance, and documentation. ChatGPT helped translate the assignment into a development plan, while Codex worked directly in the VS Code repository.

## Planning assistance

AI helped divide the application into reusable pages, components, hooks, contexts, services, types, and utilities. It also helped define the routes, Firebase data structure, security requirements, environment variables, testing strategy, and documentation structure.

## Code-generation assistance

Codex generated and revised the React and TypeScript source code, including the homepage, featured-series carousel, search, movie details, authentication, favourites, watchlist, profile page, Firebase services, catalogue importer, tests, and styling.

I did not directly edit the generated source code. My hands-on contribution was requirements selection, Firebase and OMDb configuration, integration testing, debugging, verification, and documentation.

## Debugging assistance

AI helped me resolve:

- The Windows PowerShell restriction that blocked `npm.ps1`
- OMDb key activation and request testing
- Firebase web configuration
- Email/Password and Google authentication setup
- Realtime Database permission errors
- Firebase Security Rules
- The Firebase Admin service-account path used by the catalogue importer
- Safe dry-run and limited-import testing

## Code-review assistance

AI reviewed the repository structure and suggested improvements involving accessibility, responsive design, Firebase security, environment-variable safety, duplicate prevention, protected routes, and separation between frontend Firebase code and the trusted Admin importer.

## Decisions I made myself

I selected the name **Strex** and requested:

- A featured-series carousel before the existing categories
- A separate watchlist
- A profile editor for first name, last name, region, and phone number
- Google sign-in
- Softer, lower-contrast colours
- Displaying the user's first name instead of the full email address
- Keeping the existing discovery categories below the carousel

These were student-directed decisions implemented with AI assistance.

## Manual configuration and verification

I manually:

- Activated and tested the OMDb API key
- Created and configured the Firebase project
- Enabled Email/Password and Google authentication
- Created the Realtime Database
- Published the strict database rules
- Tested profile saving, favourites, watchlist persistence, and user-data isolation
- Verified public catalogue reads and denied browser catalogue writes
- Configured Firebase Admin credentials
- Ran a dry import and a live two-record catalogue import
- Ran the final tests, linter, and production build

## What I learned

I learned how React communicates with REST APIs, how Firebase Authentication identifies users, how Realtime Database paths and rules protect per-user data, how Vite environment variables work, and why Firebase Admin credentials must never be included in frontend code. I also learned how to test integrations gradually by using dry runs and limited imports.

## Limitations of AI-generated output

AI could not configure or verify my real external accounts by itself. I had to provide the actual environment values, activate the OMDb key, configure Firebase providers, publish the rules, supply the Admin credential path, and perform live verification.

The generated project also required human review because successful automated tests do not prove that real credentials, browser behaviour, security rules, or third-party services are configured correctly.
