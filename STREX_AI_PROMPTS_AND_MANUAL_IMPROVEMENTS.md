# Strex — AI Prompts and Manual Improvements Record

**Project:** Strex  
**Tools used:** ChatGPT and Codex in VS Code  


> This document records the real prompts used during development. Improvements requested by mr but implemented by Codex should be described as **student-directed, AI-assisted improvements**, not fully manual coding. The final table is reserved for source-code changes personally made by me.

---

# 1. Prompts Given by the me to ChatGPT

## 1.1 Understanding the assignment

> what should i do

**Goal:** Understand what the assignment requires and what must be submitted.

## 1.2 Identifying the mentor application

> can i give u the link to the session and u tell me what is the the app?

> https://www.youtube.com/watch?v=pYhYlcmFOwU

**Goal:** Identify the application shown in the mentor session.

## 1.3 Asking for the first Codex prompt

> give me a prompt for codex in vscode to build a similar app

**Goal:** Generate a detailed implementation prompt for Codex.

## 1.4 Defining the design direction

> make the prompt depending on this, + i want the style to be similar to this site https://www.cineby.at/ dont tell codex to do the same like this site and give its name just describe how does it look like

**Goal:** Create an original cinematic visual style without copying or naming the reference in the Codex instructions.


## 1.5 Planning Firebase and API integration

> when codex finishes the project i will continue with you to connect the API and the firebase to my project

**Goal:** Connect OMDb, Firebase Authentication, Realtime Database, and Firebase Security Rules.

## 1.6 Importing movie data

> ok so basically the site now opens but we need to connect the api and the firebase what to do?  
> + i want codex to claim data from IMDb and add it to the database

**Goal:** Use OMDb data identified by IMDb IDs and import selected records into Firebase through a trusted script.

## 1.7 Requesting major design and feature changes

> these are some edits i wanna make give me a prompt for codex to make these changes:  
> first of all lets start with some designing changes:  
> in the home page first of all make sliding cards for some series that shows poster and a background for it and a describtion and a favourate button, and after that keep our categories such as featured this week and action picks and so on.  
> then add a watchlist button at the top bar.  
> add a page for editing personal information as first name last name and region and phone number etc  
> use other colors that are more comfortable for the eye and less constrated  
> edit the profile icon on the top and show the first name instead of the email  
> + i wanna add a sign in method with google acc do i need to tell codex to do something or just add it from firebase?

**Goal:** Add a featured-series carousel, Watchlist, profile editing, softer colours, first-name navigation display, and Google sign-in.

## 1.8 Rebranding

> change the site name to strex 

**Goal:** Rename the public-facing product from ReelVault to Strex without breaking Firebase identifiers.

## 1.9 Documentation request

> now i wanna edit the manual improvments and What prompts file, make an md file that has the prompts i gave you and the prompts u gave me for codex then in the end add the manual improvments i told you to make

**Goal:** Prepare the final prompt and improvement record.

---

# 2. Main Prompts Supplied to Codex

## 2.1 Initial application prompt

```text
Build a complete React application for movie and series discovery.

Use:
- React
- Vite
- TypeScript
- React Router
- Firebase Authentication
- Firebase Realtime Database
- OMDb API
- Organized CSS
- React Context
- Vitest and React Testing Library

Before coding:
1. Inspect the current folder.
2. Present an implementation plan.
3. List the commands you will run.
4. Implement the project in small, reusable components.
5. Run tests, lint, and build after major stages.

Main requirements:
- Home page with cinematic hero content
- Movie and series search through OMDb
- Movie cards with posters, title, year, type, details, and favourite controls
- Movie details route at /movie/:imdbID
- Firebase Email/Password registration and login
- Protected /favourites route
- Separate favourites for every Firebase UID
- Loading, error, empty, and missing-poster states
- Responsive layout for desktop, tablet, and mobile
- Accessible forms, controls, keyboard focus, and semantic HTML
- No hard-coded keys or secrets
- No large UI framework
- No giant App.tsx
- No duplicated API or Firebase logic

Use environment variables:
VITE_OMDB_API_KEY
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

Create:
README.md
AI_PROMPTS.md
AI_USAGE_REPORT.md
MANUAL_IMPROVEMENTS.md
.env.example

Run:
npm run test -- --run
npm run lint
npm run build

Do not claim verification passed unless the commands actually ran successfully.
```

## 2.2 Project-guideline and cinematic styling prompt

```text
Read CLAUDE.md and follow the existing project conventions.

Create an original cinema-inspired interface rather than copying another product.

Use:
- Deep charcoal and dark slate backgrounds
- Muted violet or pink accents
- Rounded poster cards
- Soft shadows
- Translucent borders
- A large cinematic hero using blurred poster artwork
- Horizontal curated movie rows
- A decorative Top 10 section
- Responsive navigation
- Visible keyboard focus styles
- Reduced-motion support

Do not:
- Copy branding, wording, assets, or layout from another site
- Add streaming, downloading, scraping, torrent, or playback functionality
- Introduce Tailwind, Bootstrap, Material UI, or unnecessary dependencies

Preserve modular components, services, hooks, types, utilities, tests, and documentation.
```

## 2.3 OMDb and Firebase integration prompt

```text
Continue working on the existing movie application.

Inspect the current OMDb, Firebase, authentication, favourites, types, and environment-variable code before changing anything.

OMDb:
- Use VITE_OMDB_API_KEY
- Search by title
- Fetch full details by IMDb ID
- Encode query parameters
- Reject blank searches
- Handle Response: "False"
- Convert N/A values to safe fallbacks
- Deduplicate by imdbID
- Keep raw API structures out of UI components

Firebase:
- Initialize Firebase App, Authentication, and Realtime Database
- Use only VITE_FIREBASE_* client variables
- Support registration, login, logout, and persistent auth state
- Store favourites under users/{uid}/favourites/{imdbID}
- Use set(), remove(), and onValue()
- Prevent one user from reading another user's data

Shared catalogue:
- Read curated records from catalog/{imdbID}
- Allow the frontend to read but not write the catalogue
- Keep normal searches and details using OMDb
- Fall back to OMDb when the catalogue is empty

Security:
- Deny root access by default
- Allow public catalogue reads
- Deny client catalogue writes
- Restrict users/{uid} by auth.uid

Testing:
- Mock OMDb and Firebase
- Test normalization, errors, missing keys, UID paths, favourites, and duplicate prevention

Run:
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
```

## 2.4 Movie catalogue importer prompt

```text
Create scripts/import-omdb.mjs.

The script must:
- Read OMDB_API_KEY
- Read FIREBASE_DATABASE_URL
- Use GOOGLE_APPLICATION_CREDENTIALS
- Use Firebase Admin outside the browser
- Search Batman, Star Wars, Harry Potter, Spider-Man, Mission Impossible, animation, science fiction, and comedy
- Limit the initial import to about 50 records
- Retrieve full details for selected IMDb IDs
- Normalize missing and N/A values
- Deduplicate by imdbID
- Store data at catalog/{imdbID}
- Update the same path when run again
- Limit concurrency
- Continue after individual failures
- Print imported, skipped, and failed counts

Expected record:
{
  imdbID,
  title,
  year,
  type,
  poster,
  plot,
  runtime,
  genres,
  director,
  actors,
  imdbRating,
  contentRating,
  country,
  language,
  awards,
  fetchedAt
}

Add:
"seed:movies": "node scripts/import-omdb.mjs"

Never expose Firebase Admin credentials in frontend code.
```

## 2.5 Importer safety prompt

```text
Update scripts/import-omdb.mjs to support:

- --dry-run
- --limit=N
- Logging the exact Firebase write path
- Refusing writes outside catalog/{imdbID}
- A final imported/skipped/failed summary

Do not modify the React frontend.

Run:
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build

Provide commands for:
- Dry run limited to 2
- Real import limited to 2
- Full import
```

## 2.6 Final design, profile, watchlist, Google sign-in, and Strex rebrand prompt

```text
Continue working on the existing movie application and rebrand its public-facing name to “Strex”.

Read CLAUDE.md and inspect the project before changing anything. Preserve:
- OMDb search
- Movie details
- Email/Password authentication
- Favourites
- Firebase catalogue
- Current routes
- Responsive behaviour
- Existing tests

Do not rebuild the application from scratch.

BRANDING
- Replace public-facing ReelVault branding with Strex
- Update navigation, browser title, metadata, authentication headings, documentation, and accessible labels
- Keep Firebase project IDs, database URLs, paths, environment variables, package name, and repository unchanged

SOFTER COLOUR SYSTEM
- Replace pure black with deep charcoal or dark slate
- Replace pure white with warm off-white
- Use muted lavender, dusty blue, or soft sage accents
- Reduce harsh glowing borders and bright gradients
- Preserve accessible contrast
- Use CSS custom properties

FEATURED SERIES CAROUSEL
Add a carousel before the existing homepage categories.

Each slide includes:
- Poster
- Blurred poster-derived background
- Series title
- Year
- Genre
- IMDb rating
- Short plot
- View Details
- Favourite button
- Watchlist button

Keep existing categories such as Featured This Week and Action Picks.

Add:
- Previous/next controls
- Indicators
- Keyboard access
- Mobile-friendly interaction
- Optional 7–8 second autoplay
- Pause on hover/focus
- Reduced-motion support
- Loading, empty, and error states

Prefer series from Firebase /catalog and fall back to OMDb without automatically writing fallback results.

WATCHLIST
- Add a Watchlist button in the top navigation
- Create protected /watchlist
- Store under users/{uid}/watchlist/{imdbID}
- Add and remove items
- Prevent duplicates
- Subscribe and unsubscribe correctly
- Add bookmark controls to cards, details, and carousel
- Keep Watchlist separate from Favourites

PROFILE
Create protected /profile.

Editable fields:
- First name
- Last name
- Region
- Phone number

Read-only:
- Email

Store under users/{uid}/profile.

Requirements:
- First and last name required
- Trim inputs
- Phone stored as a string
- Reasonable international validation
- Field-level errors
- aria-invalid and aria-describedby
- Disabled state while saving
- Success and failure feedback
- Update Firebase displayName
- Update navigation immediately

NAVIGATION
- Show first name instead of full email
- Use Google photoURL when available
- Otherwise use initials
- Otherwise use a generic accessible profile icon
- Keep mobile navigation usable

GOOGLE SIGN-IN
- Add “Continue with Google”
- Use GoogleAuthProvider and signInWithPopup
- Keep Email/Password login
- Handle popup cancellation, blocked popup, network errors, and account conflicts
- Preserve intended destination
- Create an initial profile from Google displayName only when no profile exists
- Do not overwrite existing profile data

FIREBASE RULES
Support:
catalog
users/{uid}/profile
users/{uid}/favourites
users/{uid}/watchlist

Rules must:
- Deny root access
- Allow public catalogue reads
- Deny browser catalogue writes
- Restrict private user paths to auth.uid
- Validate important field types
- Allow deletion of favourites and watchlist entries

TESTS
Add or update tests for:
- Carousel navigation and states
- Watchlist add/remove and duplicate prevention
- Protected Watchlist route
- Profile validation and save
- displayName update
- First-name navigation display
- Google sign-in success and errors
- Initial profile creation
- Existing profile preservation

Update README.md and AI_PROMPTS.md.

Do not describe Codex-generated work as fully manual coding.

Run:
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
```

---

# 3. My Directed Improvements

## Improvement 1 — Rebrand the application

**Before:** The public-facing name was ReelVault.  
**Requested change:** Rename it to **Strex** throughout the visible interface and documentation.  
**Reason:** Give the application an original student-selected identity.  
**Technical decision:** Keep Firebase project identifiers unchanged so the backend continues working.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 2 — Featured-series carousel

**Before:** The homepage began with regular movie categories.  
**Requested change:** Add sliding featured-series cards before the existing categories. Each slide should show a poster, atmospheric background, description, rating, details button, favourite button, and watchlist button.  
**Reason:** Make the homepage feel more cinematic and visually engaging.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 3 — Keep existing categories

**Before:** Existing categories included sections such as Featured This Week and Action Picks.  
**Requested change:** Preserve these sections below the new carousel.  
**Reason:** Add a new visual feature without removing existing discovery content.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 4 — Add Watchlist

**Before:** Users could only save favourites.  
**Requested change:** Add a separate Watchlist button, protected page, database path, and add/remove controls.  
**Reason:** Separate liked titles from titles the user plans to watch.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 5 — Add profile editing

**Before:** The application mainly used authentication email information.  
**Requested change:** Add a page for first name, last name, region, and phone number.  
**Reason:** Improve personalization and provide information used by the navigation.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 6 — Show first name instead of email

**Before:** The top navigation displayed the full email address.  
**Requested change:** Display the first name with a profile picture, initials, or fallback icon.  
**Reason:** Make the navigation cleaner and more personal.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 7 — Softer colours

**Before:** The original theme used very dark surfaces and bright purple contrast.  
**Requested change:** Use softer dark slate surfaces, warm off-white text, muted lavender accents, and gentler shadows and borders.  
**Reason:** Reduce eye strain while preserving a cinematic style.  
**Classification:** Student-directed, AI-assisted unless personally edited in source.

## Improvement 8 — Google sign-in

**Before:** Authentication supported Email/Password only.  
**Requested change:** Add Google authentication through Firebase.  
**Reason:** Make registration and sign-in faster and more convenient.  
**Manual Firebase step:** Enable Google in Firebase Console under Authentication → Sign-in method.  
**Classification:** Student-directed, AI-assisted frontend implementation plus manual Firebase configuration.

---



