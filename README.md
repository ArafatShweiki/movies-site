# Strex

Strex is a responsive movie and television discovery application built around the OMDb catalogue. It helps people browse original curated collections, search by title, inspect detailed metadata, sign in, and keep private favourites and watchlists.

Strex is a catalogue and discovery experience only. It does not play, stream, scrape, download, or link to third-party viewing sources.

## Main features

- Cinema-inspired, responsive interface for desktop, tablet, and mobile screens
- Curated movie and series collections with a featured cinematic hero
- An accessible featured-series carousel with previous/next controls, slide indicators, and restrained automatic rotation
- Dedicated Top 10 presentation whose ordering is curated, not a live popularity chart
- URL-synchronized title search at `/search?q=` with clear loading, empty, and error states
- Detailed title pages powered by OMDb's IMDb-ID endpoint
- Missing-poster fallback artwork and graceful handling of unavailable metadata
- Firebase email/password and Google authentication with persistent sessions
- Protected favourites and watchlist collections scoped to the active user
- A private account profile stored under the authenticated user's UID
- Favourite and watchlist controls shared across discovery and detail views
- Keyboard-friendly controls, visible focus states, accessible form errors, and reduced-motion support
- Unit and component tests with external services mocked

Live OMDb search, Firebase email/password authentication, Google sign-in, profile editing, first-name navigation display, favourites, watchlist persistence, cross-account data isolation, public catalogue reads, denied browser catalogue writes, and a two-record catalogue import were manually verified. The strict Realtime Database rules were published before final verification. A complete catalogue import of up to approximately 50 records was not required for this verification.

## Technology stack

- React 19 and TypeScript
- Vite
- React Router
- Standard CSS with custom properties
- OMDb REST API
- Firebase Authentication
- Firebase Realtime Database
- React Context and custom hooks
- Vitest, React Testing Library, and `jest-dom`
- ESLint

## Prerequisites

- A Node.js release supported by Vite 8 (Node.js 20.19+ or 22.12+ is recommended)
- npm
- An [OMDb API key](https://www.omdbapi.com/apikey.aspx)
- A Firebase project with Email/Password and Google Authentication plus Realtime Database enabled

## Installation

```bash
git clone https://github.com/ArafatShweiki/movies-site.git
cd movies-site
npm install
cp .env.example .env.local
```

On PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env.local
```

Fill in `.env.local`, then start the development server:

```bash
npm run dev
```

Vite prints the local URL in the terminal. Local environment files are ignored by Git and must not be committed.

If Windows PowerShell blocks `npm.ps1`, use `npm.cmd` instead, for example:

```powershell
npm.cmd run dev
```

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run test -- --run` | Run the test suite once |
| `npm run test` | Run Vitest in watch mode |
| `npm run lint` | Check the project with ESLint |
| `npm run build` | Type-check and create a production build |
| `npm run seed:movies` | Intentionally import the curated OMDb catalogue into Firebase |

## Environment configuration

Create `.env.local` from `.env.example` and provide all of the following values:

```dotenv
VITE_OMDB_API_KEY=your_omdb_api_key
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_web_app_id
```

All variables use Vite's `VITE_` prefix and are bundled into the client application. Firebase web configuration is an identifier set, not an authorization boundary; protect user data with Authentication and Realtime Database rules. Never place service-account credentials or other server secrets in this file.

The application presents configuration guidance when required variables are unavailable. Restart the Vite development server after changing `.env.local`.

## OMDb setup

1. Request an API key from the [OMDb API key page](https://www.omdbapi.com/apikey.aspx).
2. Complete OMDb's activation process if required by the selected plan.
3. Add the key to `.env.local` as `VITE_OMDB_API_KEY`.
4. Restart `npm run dev`.
5. Confirm that the home collections, a title search, and a detail page load successfully.

OMDb supplies search and title metadata; it does not provide a live trending feed. Strex therefore labels its rails and ranking as curated collections. API availability, request limits, and catalogue coverage depend on the OMDb plan.

The featured-series carousel prefers normalized series records from the public read-only Firebase `/catalog` node. If that catalogue is unavailable or contains too few suitable records, Strex falls back to documented OMDb searches. Automatic rotation pauses during pointer or keyboard interaction and is disabled when reduced motion is requested; every slide remains available through explicit controls.

## Firebase setup

### Create and register the web application

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. Add a Web app from **Project settings > General > Your apps**.
3. Copy the web configuration values into the matching `VITE_FIREBASE_*` entries in `.env.local`.
4. Ensure `VITE_FIREBASE_DATABASE_URL` exactly matches the URL shown for the Realtime Database instance, including its regional hostname when applicable.

### Enable Firebase Authentication

1. Open **Build > Authentication** in the Firebase console.
2. Select **Get started**, then open **Sign-in method**.
3. Enable the **Email/Password** provider.
4. Enable the **Google** provider, select a project support email, and save the provider configuration.
5. Add each deployed domain under **Authentication > Settings > Authorized domains**. Localhost is normally available for development.
6. If the Google OAuth consent screen is in testing mode, add the accounts that will perform manual verification as test users in Google Cloud Console.

Passwords are sent directly to Firebase Authentication and are never stored in Strex's database.

### Create the Realtime Database

1. Open **Build > Realtime Database**.
2. Create a database and choose the region closest to the expected users.
3. Start with locked mode.
4. Verify that `VITE_FIREBASE_DATABASE_URL` points to this database.
5. Publish the checked-in [`firebase-database-rules.json`](firebase-database-rules.json) file by copying its complete contents into **Realtime Database > Rules**, then selecting **Publish**.

Strex uses these user-owned records in addition to the imported `catalog/{imdbID}` records:

```text
users/
  {uid}/
    profile/
      firstName: string
      lastName: string
      region: string
      phoneNumber: string
      updatedAt: number
    favourites/
      {imdbID}/
        imdbID: string
        Title: string
        Year: string
        Type: string
        Poster: string
    watchlist/
      {imdbID}/
        imdbID: string
        title: string
        year: string
        type: string
        poster: string
        addedAt: number
```

### Realtime Database security rules

[`firebase-database-rules.json`](firebase-database-rules.json) is the canonical deployable rules file. It denies reads and writes by default, permits public read-only access to `/catalog`, and denies all client catalogue writes. An authenticated user can read and write only `/users/<their-own-uid>`. Profile, favourite, and watchlist records are type-checked, IMDb values must match their record keys, unexpected profile and item fields are rejected, and favourite or watchlist items can be deleted normally.

The checked-in file is the project's source of truth and does not deploy automatically. Its strict rules were copied to **Realtime Database > Rules**, published, and used during the final live verification. Temporary simplified rules were used only during early debugging and are no longer the intended live configuration.

Firebase Admin credentials bypass client rules, which is why the trusted catalogue importer can write `/catalog` while browser clients cannot. Keep Admin credentials out of the frontend.

After publishing, use the Firebase Rules Playground or two separate test accounts to verify all of the following:

- A signed-out client can read `/catalog` but cannot write it.
- A signed-in user can read and update only their own profile, favourites, and watchlist.
- The same user is denied access to another UID.
- A favourite or watchlist item whose `imdbID` differs from its key is rejected.
- Unexpected profile fields and malformed record types are rejected.
- Blank or overlong profile names and malformed phone values are rejected (an empty Google-sourced name is allowed only during initial profile creation when Google supplies no corresponding name part).
- Deleting an item from the active user's favourites or watchlist succeeds.

### Completed live Firebase verification

The following checks were completed against the configured Firebase project:

- The OMDb key was activated, and real homepage, search, and title-detail requests loaded successfully.
- Firebase Email/Password registration, login, logout, and restored sessions worked.
- Google sign-in completed successfully.
- Profile information saved under the authenticated UID, and the first name appeared in the navigation.
- Favourites and watchlist items could be added, restored after refresh, and removed.
- A second account could not access the first account's private profile or collections.
- A signed-out client could read the public `/catalog` data but could not write to it.
- The strict checked-in Realtime Database rules were published and verified.
- The catalogue importer completed a dry run and a live import limited to two records.

These checks confirm the configured development project. A deployment should still add its production domain to Firebase Authentication's authorized domains and repeat the main sign-in and data-access journeys after deployment.

## Trusted catalogue import

The server-side importer at `scripts/import-omdb.mjs` uses only the documented OMDb API and Firebase Admin SDK. It reads `.env.seed` when present, while existing shell environment variables take precedence. Configure these three non-`VITE_` variables:

```dotenv
OMDB_API_KEY=your_omdb_api_key
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
GOOGLE_APPLICATION_CREDENTIALS=C:\absolute\path\to\service-account-strex.json
```

- `OMDB_API_KEY` is the activated OMDb key used for catalogue searches and full-detail requests.
- `FIREBASE_DATABASE_URL` must be the exact Realtime Database URL for the intended Firebase project, including its regional hostname when applicable.
- `GOOGLE_APPLICATION_CREDENTIALS` must be an absolute path to a Firebase Admin service-account JSON file. Generate it from **Firebase console > Project settings > Service accounts > Generate new private key**.

Prefer storing the service-account file outside the repository. If it must be kept locally inside the workspace, use a filename matched by `service-account*.json` or `firebase-admin*.json`; those patterns and `.env.seed` are ignored by Git. Never commit, share, or expose the private key, and never copy Firebase Admin credentials into frontend code or a `VITE_` variable.

After confirming the target database URL, service-account project, credentials, and database rules, run the importer intentionally:

```bash
npm.cmd run seed:movies
```

The importer accepts `--dry-run` and `--limit=N`. `--limit=N` must be an integer from 1 through 50. Arguments after `--` are forwarded through npm to the importer:

```bash
# Preview two normalized records without connecting to or writing to Firebase
npm.cmd run seed:movies -- --dry-run --limit=2

# Import two records into the configured Firebase database
npm.cmd run seed:movies -- --limit=2

# Run the complete first import (up to approximately 50 records)
npm.cmd run seed:movies
```

A dry run requires only `OMDB_API_KEY`; it makes zero Firebase writes and does not require `FIREBASE_DATABASE_URL` or `GOOGLE_APPLICATION_CREDENTIALS`. Every real import requires all three variables. Use a small real limit first if you want to confirm the target database shape before the complete import.

The first import is limited to approximately 50 unique movies selected from the configured search terms. Each record is written at `catalog/{imdbID}`, so rerunning the command updates that IMDb ID rather than creating a duplicate. The script continues past individual title failures and prints imported, skipped, and failed counts when it finishes. Firebase Admin writes bypass client security rules, so verify the target project before running it.

The importer was verified with both a dry run and a live two-record import. The complete import of up to approximately 50 records was not part of the final verification.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Curated discovery home page |
| `/search?q=title` | Search results synchronized with the URL |
| `/movie/:imdbID` | Complete movie or series details |
| `/favourites` | Authenticated user's protected favourites |
| `/watchlist` | Authenticated user's protected watchlist |
| `/profile` | Authenticated user's protected profile editor |
| `/auth` | Email/password and Google account access |
| `*` | Not-found page |

When a signed-out visitor requests a protected collection or starts a favourite/watchlist action, the app sends them to `/auth` while preserving the intended destination when possible.

## Project structure

```text
.
├── public/
│   └── og.png                  # Original Strex social-preview artwork
├── scripts/
│   ├── import-omdb.mjs         # Trusted server-side catalogue importer
│   └── import-omdb.test.mjs    # Offline importer tests
├── src/
│   ├── components/             # Reusable navigation, cards, rows, forms, and states
│   ├── context/                # Authentication, favourites, and watchlist providers
│   ├── hooks/                  # Reusable stateful application logic
│   ├── pages/                  # Route-level page components
│   ├── services/               # OMDb and Firebase integrations
│   ├── styles/                 # Design tokens, components, pages, and responsive CSS
│   ├── test/                   # Shared Vitest/Testing Library setup
│   ├── types/                  # Application and API-facing TypeScript models
│   ├── utils/                  # Validation and movie-normalization helpers
│   ├── App.tsx                 # Route composition
│   ├── index.css               # Global stylesheet entry point
│   ├── main.tsx                # React entry point
│   └── vite-env.d.ts           # Typed Vite environment variables
├── .env.example                # Safe environment template
├── AI_PROMPTS.md               # Recorded AI prompts
├── AI_USAGE_REPORT.md          # Reflection on how AI assisted development
├── STUDENT_DIRECTED_IMPROVEMENTS.md
│                                # Student requests and AI-assisted refinements
├── firebase-database-rules.json # Deployable Realtime Database rules
├── eslint.config.js
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Testing

Run the complete automated suite once:

```bash
npm run test -- --run
```

The tests use Vitest and React Testing Library. Network-facing OMDb and Firebase operations are mocked; the automated suite does not contact real services or require credentials. Coverage includes form validation and error association, email and Google authentication behaviour, profile state, protected routing, movie normalization and deduplication, carousel controls, and favourite/watchlist safeguards.

Final verification was run after configuration and review:

```powershell
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
```

All three commands completed successfully. Live API and Firebase journeys were also checked as described in the completed verification section.
## Production build

Create an optimized build with:

```bash
npm run build
```

The generated `dist/` directory is intentionally ignored by Git. Before deployment, configure the same environment variables in the hosting provider, add the production hostname to Firebase Authentication's authorized domains, and configure the host to fall back to `index.html` for client-side routes.

To inspect a completed build locally, use Vite's preview command directly if no package script is defined:

```bash
npx vite preview
```

## Accessibility notes

- Semantic landmarks and heading structure support screen-reader navigation.
- All form controls have visible labels; field errors are associated through `aria-invalid` and `aria-describedby`.
- Loading and result changes use status messaging where appropriate.
- Icon-only controls expose accessible names, and poster images have meaningful alternatives.
- Interactive elements remain keyboard accessible with visible `:focus-visible` styles.
- Tap targets and text remain usable on small screens, while horizontal content rails support touch scrolling.
- Motion is restrained and disabled or reduced when `prefers-reduced-motion` is enabled.
- Missing artwork uses a stable fallback without collapsing the reserved poster area.

Automated checks cannot replace manual testing. Before release, test representative journeys with a keyboard and a screen reader, validate zoom and reflow, and confirm contrast using the final rendered interface.

## Development and review disclosure

The project requirements, branding, feature choices, and visual changes were directed by the student, while Codex was used to generate and revise the application source code. The student did **not** directly edit the source code.

The student's hands-on work included:

- Choosing the **Strex** name and requesting the carousel, watchlist, profile, softer palette, first-name account display, and Google sign-in
- Configuring and activating OMDb
- Creating and configuring the Firebase project
- Enabling authentication providers
- Publishing and testing Realtime Database security rules
- Testing authentication, profiles, favourites, watchlists, data isolation, and catalogue permissions
- Configuring Firebase Admin credentials and verifying the catalogue importer
- Running the final tests, linter, and production build

These contributions are documented as student-directed, AI-assisted development and manual configuration/testing, not as direct manual source-code edits.

## Development and review disclosure

The student selected the project requirements, branding, feature priorities, and visual direction. Codex generated and revised the application source code. The student did **not** directly edit the source code.

The student's hands-on contribution included:

- Choosing the **Strex** name and requesting the carousel, watchlist, profile, softer palette, first-name account display, and Google sign-in
- Configuring and activating OMDb
- Creating and configuring the Firebase project
- Enabling authentication providers
- Publishing and testing Realtime Database security rules
- Testing authentication, profiles, favourites, watchlists, data isolation, and catalogue permissions
- Configuring Firebase Admin credentials and verifying the catalogue importer
- Running the final tests, linter, and production build
- Reviewing and documenting the development process

These contributions are documented as student-directed, AI-assisted development and manual configuration/testing, not as direct manual source-code edits.

## Known limitations

- A valid OMDb key and configured Firebase project are required for full end-to-end operation.
- OMDb search is title-oriented and its free plan may impose usage limits.
- Collections and the Top 10 rail are editorial search groupings, not real-time trend or popularity data.
- OMDb can return incomplete fields or `N/A`; the interface omits unavailable detail labels.
- Poster URLs and metadata quality are controlled by OMDb and its upstream catalogue.
- Strex does not provide playback, streaming availability, downloads, or watch-provider links.
- Authentication supports email/password and Google; account verification, password reset, and additional identity providers are not included.

## Future improvements

- Add paginated search and optional filters for year and content type.
- Add password-reset and email-verification account flows.
- Add user-created lists and private notes beyond favourites and the watchlist while retaining per-user security rules.
- Add end-to-end browser tests against dedicated test projects.
- Add offline-aware caching and richer resilience for rate limits.
- Add localized interface copy and locale-aware metadata presentation.

## Related project records

- [AI_PROMPTS.md](AI_PROMPTS.md) records the detailed prompts sent to Codex during development.
- [AI_USAGE_REPORT.md](AI_USAGE_REPORT.md) explains how AI assisted with planning, implementation, debugging, and review.
- [STUDENT_DIRECTED_IMPROVEMENTS.md](STUDENT_DIRECTED_IMPROVEMENTS.md) records the student's requests, product decisions, and AI-assisted refinements. It also states that no direct source-code edits were made by the student.
