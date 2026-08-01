# AI Prompt Log

This log preserves the chronological prompts used for the Strex project. Historical outcomes describe the project status when each Codex task ended; later manual configuration and verification are recorded in the final section.

## Prompt 1

- **Date:** 2026-08-01
- **Purpose:** Plan, implement, test, and document a complete frontend movie and television discovery application.
- **AI tool:** OpenAI Codex
- **Outcome:** Implemented the initial application (now branded Strex) on `feature/reelvault-app`. The final mocked verification completed with 12 test files and 59 tests passing; ESLint and the production TypeScript/Vite build also passed. Live OMDb, Firebase, and rendered multi-viewport checks still require credentials or an available browser session.

### Complete prompt

````text
Build a complete frontend modern movie and television discovery application. 

The application should allow users to discover titles, search for movies and series, view detailed information, create an account, and maintain a personal favourites list.

This is a movie discovery and catalogue application only. Do not implement video playback, movie streaming, scraping, torrent links, third-party streaming sources, or download functionality.

The design and implementation must be original. Do not clone an existing website, copy its branding, copy its text, or reproduce its layout pixel-for-pixel.

==================================================
FIRST: INSPECT AND PLAN
==================================================

Before making changes:

1. Read the CLAUDE.md file in the project root and follow all of its rules.
2. Inspect the current project directory.
3. Determine whether this is an empty folder or an existing React project.
4. Preserve existing conventions and functionality when applicable.
5. Present a concise implementation plan.
6. List the commands you intend to run.
7. Identify any configuration that I will need to complete manually.
8. Then implement the application directly in the project files.

Do not dump every source file into the chat. Create and edit the files inside the repository.

If the directory is empty, create a Vite project using React and TypeScript.

Use:

- React
- TypeScript
- Vite
- React Router
- Standard CSS organized into maintainable files
- OMDb REST API
- Firebase Authentication
- Firebase Realtime Database
- React Context for authentication state
- Vitest
- React Testing Library
- ESLint

Do not introduce:

- Tailwind CSS
- Bootstrap
- Material UI
- Large component libraries
- Unnecessary dependencies
- The `any` type unless there is a documented technical reason

==================================================
GIT WORKFLOW
==================================================

If the folder is already a Git repository:

1. Check the repository status before making changes.
2. Do not delete, overwrite, or revert unrelated user work.
3. Create a feature branch named:

   feature/reelvault-app

4. Keep changes grouped logically.
5. Use focused, meaningful commit messages after each verified stage.

Suggested commits:

- setup React project architecture
- build movie discovery interface
- add movie search and details
- add Firebase authentication
- add user favourites
- add tests and accessibility improvements
- add project documentation

Do not commit:

- node_modules
- dist
- .vite
- coverage
- .env
- local cache files

Commit package-lock.json.

==================================================
APPLICATION ROUTES
==================================================

Create these routes:

- `/` — Home page
- `/search?q=` — Search results, or manage search through the home page URL
- `/movie/:imdbID` — Movie or series details
- `/favourites` — Protected favourites page
- `/auth` — Login and registration
- `*` — Not Found page

Create a reusable `ProtectedRoute` component.

Unauthenticated users who try to open `/favourites` should be redirected to `/auth`. Preserve the intended destination so they can return after logging in.

==================================================
VISUAL DIRECTION
==================================================

Create a polished, original cinema-inspired interface.

The interface should feel immersive and visual rather than looking like a normal admin dashboard.

Use the following design direction:

- Near-black page background with subtle charcoal variation
- Soft purple, violet, or pink accent colour
- High-contrast white headings
- Muted grey secondary text
- Subtle gradients and atmospheric glows
- Rounded cards and controls
- Thin translucent borders
- Soft shadows rather than heavy outlines
- Modern, spacious typography
- Smooth but restrained animations
- CSS custom properties for colours, spacing, radii, shadows, and typography

Do not copy logos, images, assets, wording, or exact colour values from another product.

Use movie artwork returned by the API. Do not download or copy artwork manually from another website.

The application should contain:

1. A compact navigation bar

   - Brand mark and “ReelVault” name
   - Home link
   - Favourites link
   - Search control
   - Login button when logged out
   - User menu and Logout button when logged in
   - Slightly translucent dark background
   - Rounded navigation controls
   - Sticky or fixed positioning without covering page content

2. A large cinematic hero section

   - Feature one movie from the loaded results
   - Use its poster as an atmospheric background
   - Blur and enlarge the background image so it works like a backdrop
   - Add strong dark gradients to preserve text readability
   - Show title, year, type, rating when available, and a short plot
   - Include “View Details” and “Add to Favourites” buttons
   - Do not include a “Watch Now” or playback button
   - Fade the hero naturally into the page background

3. Content sections

   Build horizontal poster sections such as:

   - Featured This Week
   - Action Picks
   - Science-Fiction Worlds
   - Series Spotlight
   - Comedy Night
   - Top 10 Picks

   Since OMDb does not provide live trending rankings, do not falsely claim that these are real-time trends. Generate the sections using carefully selected search queries and clearly present them as curated collections.

4. Top 10 presentation

   - Display ten curated titles
   - Include large decorative ranking numbers
   - Use a horizontal layout on small screens
   - Use a compact ranked rail or wide row on larger screens
   - Do not imply the ranking is live data unless the API supports it

5. Poster cards

   - Use a portrait 2:3 ratio
   - Rounded corners
   - Poster image
   - Title
   - Year
   - Movie or series type
   - Optional rating when details are available
   - Favourite heart button
   - Details button or clickable card
   - Subtle image zoom and card lift on hover
   - Visible keyboard focus state
   - Dark gradient overlay for text where appropriate
   - Fallback artwork when the poster is missing or fails to load

6. Responsive layout

   The interface must work correctly at:

   - Large desktop
   - Laptop
   - Tablet
   - Mobile screens down to approximately 360px

   On mobile:

   - Prevent horizontal page overflow
   - Keep horizontal movie rows touch-scrollable
   - Make buttons large enough to tap
   - Reduce hero height appropriately
   - Collapse or simplify navigation
   - Keep important actions visible
   - Do not make text unreadably small

==================================================
HOME PAGE AND MOVIE DISCOVERY
==================================================

The Home page should:

- Load several curated movie collections when the application starts
- Combine and deduplicate results using `imdbID`
- Display a hero movie
- Display multiple horizontal movie sections
- Include loading skeletons
- Include API error feedback
- Include empty states
- Allow retrying failed requests
- Avoid repeatedly requesting identical data

Possible OMDb search terms include:

- Batman
- Avengers
- Star Wars
- Harry Potter
- Mission Impossible
- Spider-Man
- comedy
- space
- detective
- animation

Organize these results into original curated sections. Do not label arbitrary results as live trends.

Use a service layer for API requests.

Handle:

- Failed network requests
- Invalid API responses
- OMDb responses where `Response` is `"False"`
- Missing posters
- Duplicate titles
- Empty results
- Missing environment variables
- Component unmounting during asynchronous requests

Use `AbortController` where it provides a real benefit.

==================================================
SEARCH
==================================================

Create a reusable search component.

Requirements:

- Search by movie or series title
- Trim whitespace
- Prevent empty submissions
- Synchronize the query with the URL when practical
- Preserve search results when navigating back from a details page
- Display loading feedback
- Display “No results found”
- Display helpful API errors
- Add a clear/reset action
- Support Enter-key submission
- Include a properly associated accessible label
- Connect errors with `aria-invalid` and `aria-describedby`

Do not send a new API request for a blank query.

==================================================
MOVIE DETAILS PAGE
==================================================

Use the OMDb IMDb-ID endpoint to retrieve complete information.

Display:

- Poster
- Title
- Year
- Content type
- Content rating
- Runtime
- Genre
- Director
- Writer
- Actors
- Plot
- Language
- Country
- Awards
- IMDb rating
- Other available ratings
- Add/remove favourite button
- Back navigation

Handle `"N/A"` values gracefully. Do not display labels with empty values.

The details page should have a cinematic header using the poster as a blurred background with a dark gradient overlay.

Include:

- Loading skeleton
- Invalid ID state
- Not-found state
- API failure state
- Retry action
- Responsive layout

==================================================
AUTHENTICATION
==================================================

Create an authentication page with two modes:

- Login
- Create Account

Use Firebase email/password authentication.

Registration fields:

- Email
- Password
- Confirm password

Login fields:

- Email
- Password

Validation requirements:

- Required-field validation
- Valid email format
- Trim email input
- Reasonable password minimum
- Matching password confirmation
- Prevent duplicate submission
- Disable the submit button while processing
- Display useful Firebase errors instead of raw internal error codes
- Keep the user logged in after refreshing
- Redirect authenticated users away from the authentication page when appropriate

Accessibility requirements:

- Every input has a visible label
- Error text appears beside the correct field
- Use `aria-invalid`
- Use `aria-describedby`
- Use semantic form elements
- Use `fieldset` and `legend` when controls are logically grouped
- Move focus appropriately when a major submission error occurs
- Ensure the entire form is usable with a keyboard

Do not store passwords manually.

==================================================
FAVOURITES
==================================================

Use Firebase Realtime Database.

Store each user’s favourites separately:

users/
  {uid}/
    favourites/
      {imdbID}/
        imdbID
        Title
        Year
        Type
        Poster

Requirements:

- Only authenticated users may access their favourites
- Load favourites for the active UID only
- Add a movie to favourites
- Remove a movie from favourites
- Avoid duplicates by using `imdbID` as the database key
- Update favourite icons throughout the application
- Show processing feedback during updates
- Show errors without breaking the page
- Show an attractive empty state
- Prevent one user from reading another user’s favourites
- Clean up database subscriptions correctly
- Confirm destructive removal only when it improves usability; do not make simple removal unnecessarily annoying

If a logged-out user presses a favourite button:

- Explain that authentication is required
- Redirect to the authentication page
- Return to the original movie after successful authentication when possible

Create Firebase security-rule examples in the README so users can only access their own data.

==================================================
PROJECT ARCHITECTURE
==================================================

Keep components small and reusable.

Use a structure similar to:

src/
  assets/
  components/
    AppShell/
    Navbar/
    HeroBanner/
    SearchForm/
    MovieCard/
    MovieRow/
    RankedMovieRow/
    MovieGrid/
    FavouriteButton/
    LoadingSkeleton/
    ErrorState/
    EmptyState/
    ProtectedRoute/
  context/
    AuthContext.tsx
  hooks/
    useAuth.ts
    useFavourites.ts
    useMovieSearch.ts
  pages/
    HomePage/
    MovieDetailsPage/
    AuthPage/
    FavouritesPage/
    NotFoundPage/
  services/
    omdbService.ts
    firebase.ts
    favouritesService.ts
  types/
    movie.ts
    auth.ts
  utils/
    validation.ts
    movieHelpers.ts
  test/
    setup.ts
  App.tsx
  main.tsx
  index.css

You may adjust this structure when there is a clear technical reason.

Architecture requirements:

- Functional React components
- Custom hooks for reusable stateful logic
- TypeScript interfaces for API and application models
- API logic outside UI components
- Firebase logic outside presentation components
- No duplicated favourite logic
- No giant App.tsx
- No unused imports
- No unexplained `any`
- No hard-coded secrets
- Descriptive names
- Concise comments only for non-obvious logic

Normalize raw API responses into internal application types instead of spreading API-specific structures throughout the UI.

==================================================
ENVIRONMENT VARIABLES
==================================================

Use:

VITE_OMDB_API_KEY
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

Create:

- `.env.example` with placeholder values
- Appropriate TypeScript definitions for Vite environment variables
- A helpful configuration error state
- `.gitignore` entries for the real `.env` files

Never commit actual credentials.

Do not fabricate working credentials.

==================================================
ACCESSIBILITY
==================================================

Meet these requirements throughout the application:

- Semantic HTML
- Correct heading hierarchy
- Keyboard navigation
- Visible `:focus-visible` styles
- Accessible names for icon-only controls
- Meaningful image alt text
- Decorative images hidden from assistive technology
- Sufficient contrast
- Reduced-motion support using `prefers-reduced-motion`
- Status announcements using `aria-live` where appropriate
- Dialog focus handling if a dialog is added
- No interaction that depends only on hover
- Buttons must be buttons, not clickable `div` elements

==================================================
PERFORMANCE
==================================================

Use practical performance improvements:

- Avoid duplicate API calls
- Cache session-level collection results where appropriate
- Lazy-load poster images
- Use route-level code splitting where reasonable
- Avoid unnecessary rerenders
- Memoize only when it solves a demonstrated problem
- Limit the number of simultaneous detailed-movie requests
- Use lightweight CSS animations
- Prevent layout shift by reserving poster dimensions

Do not overengineer the project.

==================================================
AUTOMATED TESTING
==================================================

Use Vitest and React Testing Library.

Every form must include automated tests covering:

- Required fields
- Invalid formats
- Whitespace-only input
- Relevant edge cases
- Successful submission
- Failed submission
- Disabled/loading state
- Reset or clear behaviour
- Accessibility attributes
- Correct field-level error association

At minimum, create tests for:

1. Search form

   - Empty search
   - Whitespace-only search
   - Valid submission
   - Clear/reset action
   - Accessible error association

2. Login form

   - Missing fields
   - Invalid email
   - Successful mocked submission
   - Firebase error handling
   - Loading state
   - Accessibility attributes

3. Registration form

   - Missing fields
   - Invalid email
   - Weak password
   - Mismatched confirmation
   - Successful mocked submission
   - Reset behaviour
   - Accessibility attributes

4. ProtectedRoute

   - Redirects logged-out users
   - Allows authenticated users

5. Movie utilities or API transformation

   - Deduplicates movies
   - Handles missing posters
   - Handles OMDb error responses
   - Converts `"N/A"` correctly

6. Favourite behaviour

   - Adds a favourite
   - Prevents duplicates
   - Removes a favourite
   - Rejects operations without a user

Mock external API and Firebase requests. Do not make real network requests in tests.

Tests should verify behaviour rather than internal implementation details.

==================================================
DOCUMENTATION
==================================================

Create a professional `README.md` containing:

- Project name
- Project description
- Main features
- Technology stack
- Installation
- Development commands
- Environment configuration
- OMDb API key setup
- Firebase project setup
- Firebase Authentication setup
- Realtime Database setup
- Suggested database security rules
- Project structure
- Testing instructions
- Production build instructions
- Screenshot placeholders
- Accessibility notes
- Known limitations
- Future improvements

Create `AI_PROMPTS.md`.

Requirements:

- Add this complete prompt as the first recorded prompt
- Create space for future prompts
- Include date, purpose, AI tool, and outcome fields
- Do not invent prompts that were not actually used

Create `AI_USAGE_REPORT.md` with honest placeholder sections for:

- How AI assisted
- Planning assistance
- Code-generation assistance
- Debugging assistance
- Code-review assistance
- Decisions I made myself
- What I learned
- Limitations of AI-generated output

Do not falsely state that the student completed work that has not occurred.

Create `MANUAL_IMPROVEMENTS.md` with a table containing:

- AI-generated suggestion
- Problem identified during review
- Manual correction or refactor
- Reason for the change
- Files affected
- Verification performed

Include TODO placeholders rather than fabricated manual improvements.

==================================================
VERIFICATION
==================================================

After implementing the project, run:

- npm install
- npm run test -- --run
- npm run lint
- npm run build

Also check:

- No TypeScript errors
- No ESLint errors
- No failing tests
- No unused variables
- No secrets in source files
- No node_modules, dist, .vite, or .env tracked by Git
- Home page works
- Search works with mocked or configured API data
- Movie details route works
- Authentication state persists
- Protected routes redirect correctly
- Favourites are scoped to the active user
- Duplicate favourites are prevented
- Missing posters use a fallback
- Missing environment variables show useful instructions
- Layout is responsive at approximately 360px, 768px, 1024px, and 1440px
- Keyboard navigation works
- Form errors are connected to their fields
- Reduced-motion preferences are respected

Do not claim that a command passed unless you actually ran it and saw a successful result.

When a real API key or Firebase project is unavailable, use mocks for automated verification and clearly identify which manual checks still require configuration.

==================================================
FINAL RESPONSE
==================================================

When finished, provide:

1. A concise summary of the completed application.
2. The final project structure.
3. A list of major files created or changed.
4. Commands that were actually run.
5. Exact test, lint, and build results.
6. Firebase setup steps I must complete.
7. OMDb setup steps I must complete.
8. Any functionality that could not be tested without credentials.
9. Any unresolved issues.
10. Three realistic manual improvements that I can personally make, test, and document for the assignment.

Begin by reading CLAUDE.md, inspecting the folder, and presenting the implementation plan.
````

## Prompt 2

- **Date:** 2026-08-01
- **Purpose:** Add and verify a trusted server-side OMDb catalogue importer for Firebase Realtime Database.
- **AI tool:** OpenAI Codex
- **Outcome:** Added the importer, offline tests, dependency and lint integration, secret-ignore rules, and setup documentation. The full suite passed with 13 test files and 72 tests; ESLint and the production build passed. The importer was intentionally not executed because real credentials were not provided.

### Complete prompt

```text
Continue working on the existing ReelVault project.

Create a trusted Node.js script at scripts/import-omdb.mjs that imports a small curated movie catalogue from OMDb into Firebase Realtime Database.

Requirements:

- Read movie data only through the documented OMDb API.
- Never scrape IMDb pages.
- Read OMDB_API_KEY from an environment variable.
- Read FIREBASE_DATABASE_URL from an environment variable.
- Initialize Firebase Admin using GOOGLE_APPLICATION_CREDENTIALS.
- Never place Firebase Admin credentials in frontend code.
- Search these terms:
  Batman
  Star Wars
  Harry Potter
  Spider-Man
  Mission Impossible
  animation
  science fiction
  comedy

- Limit the first import to approximately 50 movies.
- Deduplicate results using imdbID.
- Retrieve full details for every selected IMDb ID.
- Normalize N/A and missing fields.
- Store each movie at catalog/{imdbID}.
- Rerunning the script must update the same movie rather than create duplicates.
- Limit concurrent OMDb requests.
- Continue when one title fails.
- Print imported, skipped, and failed counts at the end.

Use this database shape:

catalog/{imdbID}:
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

Install firebase-admin and dotenv only if they are not already installed.

Add this package.json script:

"seed:movies": "node scripts/import-omdb.mjs"

Ensure these remain ignored by Git:

.env.seed
service-account*.json
firebase-admin*.json

Do not execute the importer yet. First run its automated tests, lint, and production build. Explain exactly which environment variables I must configure.
```

## Prompt 3

- **Date:** 2026-08-01
- **Purpose:** Add safe dry-run and import-limit CLI controls to the trusted OMDb catalogue importer.
- **AI tool:** OpenAI Codex
- **Outcome:** Added strict `--dry-run` and `--limit=N` handling, isolated dry runs from Firebase, validated and logged exact catalogue paths before writes, expanded offline safety tests, and documented the commands. The final suite passed with 13 test files and 97 tests; ESLint and the production build passed. The importer was intentionally not executed.

### Complete prompt

```text
Update the existing scripts/import-omdb.mjs importer to support:

1. A --dry-run option that retrieves and normalizes movies but performs no Firebase writes.
2. A --limit=N option that limits the total number of imported movies.
3. Clear logging of the exact Firebase path before each write.
4. A safety check that refuses to write anywhere except catalog/{imdbID}.
5. A confirmation summary showing imported, skipped, and failed counts.

Do not modify the React frontend.

After the change, run:
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build

Then give me the exact commands for:
- a dry run limited to 2 movies
- a real import limited to 2 movies
- the complete import
```

## Prompt 4

- **Date:** 2026-08-02
- **Purpose:** Refine the existing application with Strex branding, a softer visual system, featured-series discovery, watchlists, profiles, Google authentication, security rules, tests, and documentation.
- **AI tool:** OpenAI Codex
- **Outcome:** Implemented the Strex redesign, featured-series carousel, separate watchlist, profile editing, profile-aware navigation, Google sign-in, private Firebase data rules, and expanded documentation/tests. Final mocked verification passed 25 test files and 167 tests; ESLint and the TypeScript/Vite production build passed. Firebase rules were not deployed, and live credential-backed plus rendered multi-viewport checks remain manual.

### Complete prompt

````text
Continue working on the existing ReelVault project.

Read CLAUDE.md and inspect the current implementation before modifying anything. Preserve all currently working functionality, including:

- OMDb search
- Movie and series details
- Firebase Email/Password authentication
- Favourites
- Firebase catalogue
- Responsive navigation
- Current routes and testing setup

Do not rebuild the project from scratch.

Before coding:

1. Inspect the current homepage, navigation, authentication context, Firebase services, favourites logic, routing, styles, tests, and database types.
2. Explain the existing implementation briefly.
3. Present a concise implementation plan.
4. List the files you expect to modify.
5. Preserve unrelated user work.
6. Do not claim that Firebase Console changes were completed automatically.

==================================================
1. SOFTER VISUAL REDESIGN
==================================================

Update the application’s colour system to feel softer, calmer, and more comfortable for long viewing.

Avoid:

- Pure black backgrounds
- Pure white text
- Extremely bright purple gradients
- Harsh glowing borders
- Excessively strong contrast
- Large areas of saturated colour

Use a softer cinema-inspired dark palette such as:

- Deep charcoal or dark slate page backgrounds
- Slightly lighter slate surfaces
- Warm off-white primary text
- Muted grey-blue secondary text
- Muted lavender as the main accent
- Soft sage or dusty blue as secondary accents
- Subtle borders and shadows

Create or update CSS custom properties for:

- Background colours
- Surface colours
- Text colours
- Muted text
- Accent colours
- Borders
- Shadows
- Border radii
- Spacing

The new theme should be less visually harsh while still maintaining readable and accessible contrast.

Preserve the current polished cinematic feel.

Use restrained animations and continue respecting prefers-reduced-motion.

==================================================
2. FEATURED SERIES CAROUSEL
==================================================

Add a large featured-series carousel near the top of the homepage.

It should appear after the navigation and before the existing sections such as:

- Featured This Week
- Action Picks
- Science-Fiction Worlds
- Series Spotlight
- Comedy Night
- Top 10 Picks

Do not remove the current categories.

The carousel should contain approximately five featured television series.

Each slide should include:

- A large atmospheric background
- A foreground poster
- Series title
- Release year
- Genre
- IMDb rating when available
- Short description or plot
- View Details button
- Add/remove Favourite button
- Add/remove Watchlist button

OMDb normally supplies posters rather than wide backdrop images. Use the series poster as a blurred and enlarged background with layered dark gradients. Do not scrape or download backdrop images from another website.

Carousel behaviour:

- Previous and next buttons
- Slide indicator buttons
- Keyboard-accessible controls
- Swipe-friendly layout on mobile when practical
- Optional automatic slide progression every 7–8 seconds
- Pause automatic movement while the carousel is hovered or keyboard-focused
- Disable automatic movement when prefers-reduced-motion is enabled
- Do not reset unexpectedly when a favourite or watchlist action occurs

Data behaviour:

- Prefer series already available in Firebase /catalog where type is "series"
- Use only records with usable posters and plots
- Fall back to selected OMDb series searches if the catalogue does not contain enough series
- Deduplicate using imdbID
- Do not write fallback search results automatically into Firebase
- Include loading, empty, and error states

Create reusable components rather than placing all carousel logic inside HomePage.

A reasonable structure may include:

components/
  FeaturedSeriesCarousel/
    FeaturedSeriesCarousel.tsx
    FeaturedSeriesCarousel.css
    FeaturedSeriesSlide.tsx

==================================================
3. WATCHLIST FEATURE
==================================================

Add a separate Watchlist feature.

Favourites and Watchlist must remain different:

- Favourite means the user likes the title
- Watchlist means the user plans to watch it later

Add a Watchlist button to the top navigation.

Create a protected route:

/watchlist

Store data under:

users/{uid}/watchlist/{imdbID}

Use this normalized structure:

{
  imdbID: string,
  title: string,
  year: string,
  type: string,
  poster: string,
  addedAt: number
}

Requirements:

- Only authenticated users may access the Watchlist page
- Redirect unauthenticated users to /auth
- Preserve the intended destination after login
- Add and remove watchlist items
- Prevent duplicates using imdbID as the Firebase key
- Subscribe to the current user’s watchlist
- Unsubscribe correctly when the user changes or the component unmounts
- Show loading, empty, and error states
- Display watchlist items using existing reusable movie-card components where practical
- Add a bookmark-style button to movie cards, movie details, and the new carousel
- Make favourites and watchlist icons visually distinct
- Use clear accessible labels such as:
  - Add to watchlist
  - Remove from watchlist
  - Add to favourites
  - Remove from favourites

Create reusable services and hooks such as:

services/watchlistService.ts
hooks/useWatchlist.ts
pages/WatchlistPage/

Do not duplicate the entire favourites implementation. Extract shared collection logic when this clearly improves maintainability.

==================================================
4. PROFILE PAGE
==================================================

Create a protected profile page at:

/profile

Allow the authenticated user to view and edit:

- First name
- Last name
- Country or region
- Phone number

The page may also display the account email as read-only.

Store extended profile information under:

users/{uid}/profile

Suggested structure:

{
  firstName: string,
  lastName: string,
  region: string,
  phoneNumber: string,
  updatedAt: number
}

Requirements:

- First name is required
- Last name is required
- Trim all text inputs
- Region may use a select or text input consistent with the current design
- Phone number is optional
- Store phone numbers as strings, not numbers
- Accept an optional leading +
- Validate phone numbers reasonably without rejecting valid international formats unnecessarily
- Show errors beside the correct fields
- Use aria-invalid and aria-describedby
- Disable submission while saving
- Show successful-save feedback
- Show Firebase permission and network errors clearly
- Do not overwrite existing profile fields with empty values accidentally
- Do not expose one user’s profile to another user

After a successful save:

- Update Firebase Authentication displayName using the first and last name
- Update the profile context immediately
- Update the navigation without requiring a page refresh

Do not store sensitive authentication credentials in the database.

==================================================
5. NAVIGATION PROFILE DISPLAY
==================================================

Replace the current email display in the top navigation.

Show:

- The user’s first name
- A profile icon or avatar
- A small menu or link leading to /profile
- Logout

Display priority:

1. Use users/{uid}/profile/firstName when available
2. Otherwise use the first portion of Firebase Auth displayName
3. Otherwise display "Account"
4. Do not show the full email as the main navigation label

Avatar priority:

1. Use Firebase Auth photoURL when available
2. Otherwise show initials based on first and last name
3. Otherwise show a generic accessible profile icon

Ensure:

- Long names do not break the navigation
- Mobile navigation remains usable
- Avatar images have appropriate alt text
- Menu controls are keyboard accessible
- Focus moves correctly when opening and closing the menu

==================================================
6. GOOGLE SIGN-IN
==================================================

Add Google authentication to the existing authentication page.

Firebase Console configuration will be completed manually. Do not pretend the provider was enabled automatically.

Use the modular Firebase JavaScript SDK:

- GoogleAuthProvider
- signInWithPopup

Requirements:

- Add a clearly labelled “Continue with Google” button
- Include a Google icon without using an unnecessary UI library
- Disable the button while authentication is in progress
- Handle popup cancellation cleanly
- Handle popup-blocked errors
- Handle network errors
- Handle account-exists-with-different-credential errors with a useful message
- Preserve the intended destination after login
- Do not remove Email/Password authentication
- Do not create duplicate auth state listeners

After successful Google sign-in:

1. Check users/{uid}/profile
2. If no profile exists, create one using available Google information:
   - firstName from the first portion of displayName
   - lastName from the remaining displayName
   - region as an empty string
   - phoneNumber as an empty string
   - updatedAt using Date.now()
3. Do not overwrite an existing user profile on later Google logins
4. Use Google photoURL for the profile avatar when available
5. Continue using the Firebase UID for favourites, watchlist, and profile data

For Email/Password registration:

- Add first name and last name fields if they are not already present
- Save the initial profile under users/{uid}/profile
- Call updateProfile so Firebase Auth displayName matches the submitted name

Keep authentication logic inside the existing AuthContext or authentication service architecture.

==================================================
7. FIREBASE DATA AND SECURITY
==================================================

Update the local firebase-database-rules.json file to support:

- Public read-only catalogue
- Private favourites
- Private watchlist
- Private profile

Expected structure:

catalog/
users/
  {uid}/
    profile/
    favourites/
    watchlist/

The rules must:

- Deny root access by default
- Allow public reads from catalog
- Deny client writes to catalog
- Allow a user to read and write only users/{their own uid}
- Prevent unauthenticated profile, favourite, or watchlist access
- Allow deletion of favourite and watchlist entries
- Validate important field types
- Use imdbID as the favourite and watchlist key
- Allow valid profile updates
- Reject unexpected profile fields when practical

Do not deploy rules automatically unless Firebase CLI is already safely configured.

At the end, print the exact rules and explain that I must paste and publish them manually in Firebase Console.

==================================================
8. TYPES AND STATE MANAGEMENT
==================================================

Add appropriate TypeScript interfaces for:

- UserProfile
- WatchlistItem
- FeaturedSeriesSlide

Do not use any without a documented technical reason.

Avoid:

- Duplicated Firebase listeners
- Duplicated collection transformations
- Storing raw Firebase snapshots directly in presentation components
- Large components with unrelated responsibilities
- Moving all new logic into App.tsx

Keep UI, API, Firebase, and state logic separated.

==================================================
9. ACCESSIBILITY
==================================================

Ensure the new features support:

- Keyboard navigation
- Visible focus styles
- Accessible carousel controls
- Proper button elements
- Accessible labels for icon-only buttons
- Semantic form structure
- Correct heading hierarchy
- Error association using aria-describedby
- aria-live for save and error feedback
- Reduced-motion preferences
- Touch targets suitable for mobile
- Sufficient readable contrast despite the softer theme

The carousel must remain usable without autoplay.

==================================================
10. AUTOMATED TESTING
==================================================

Add or update tests for:

Featured carousel:
- Renders a featured series
- Previous and next controls
- Indicator selection
- Reduced-motion behaviour where practical
- Favourite and watchlist actions
- Empty and error states

Watchlist:
- Protected route
- Add item
- Prevent duplicate
- Remove item
- Logged-out behaviour
- Correct UID database path

Profile:
- Required first and last name
- Phone validation
- Successful mocked save
- Failed save
- Loading state
- Firebase displayName update
- Correct accessibility attributes

Navigation:
- Shows first name instead of email
- Uses Google photo when available
- Uses initials as fallback
- Handles missing profile safely

Google authentication:
- Successful mocked sign-in
- Popup cancellation
- Popup blocked
- Network error
- Initial profile creation
- Existing profile is not overwritten

Do not make real Firebase or OMDb requests in automated tests.

==================================================
11. DOCUMENTATION
==================================================

Update README.md with:

- New carousel
- Watchlist functionality
- Profile page
- Google sign-in setup
- Updated database structure
- Updated Firebase rules
- Manual Firebase Console steps

Update AI_PROMPTS.md by adding this complete prompt as the next actual prompt.

Do not automatically claim these changes as manual coding inside MANUAL_IMPROVEMENTS.md.

Instead, add a note that they were user-requested, AI-assisted refinements. Leave space for me to record direct manual corrections after reviewing the result.

==================================================
12. VERIFICATION
==================================================

After implementation, run:

npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build

Do not claim success unless each command was actually run.

Manually inspect in source or tests:

- Homepage carousel
- Existing homepage categories remain
- Watchlist navigation and route
- Profile loading and saving
- Navigation first-name display
- Google sign-in integration
- Email/Password login remains functional
- Favourites remain functional
- Mobile navigation
- Reduced-motion support
- No Firebase credentials are hard-coded
- Existing catalogue functionality is preserved

In the final response provide:

1. Summary of changes
2. Files added or modified
3. Database paths added
4. Firebase Console steps I still need to complete
5. Updated database rules
6. Tests, lint, and build results
7. Anything not verified without real credentials
8. Suggestions for two small direct manual edits I can personally make and document

Begin by inspecting the current project and presenting the implementation plan.
==================================================
APPLICATION BRANDING
==================================================

Rename the public-facing application from “ReelVault” to “Strex”.

Update all visible branding, including:

- Navigation logo text
- Browser page title
- Metadata and page descriptions
- Authentication page headings
- Loading and empty-state wording where the old name appears
- README title and project description
- Screenshot labels and documentation
- Accessible labels containing the application name
- Any fallback initials or generated logo text

Create or update the visual logo so it fits the name “Strex” and the softer cinema-inspired design.

Do not rename or recreate the existing Firebase project, Firebase project ID, database URL, authentication users, database paths, environment-variable names, Git repository, or package name unless technically necessary. Existing backend identifiers such as `reelvault-a3b6f` must continue working.

Search the entire project for old visible references to:

- ReelVault
- Reel Vault
- reelvault

Replace public-facing references with “Strex”, but preserve technical Firebase identifiers and existing database configuration.

The final application should display the name exactly as:

Strex
````

## Final Manual Configuration and Verification

After the Codex implementation was completed, I manually configured and verified:

- The OMDb API key and live movie requests
- Firebase Email/Password authentication
- Google authentication
- Profile editing and first-name navigation display
- Favourites and watchlist persistence
- Data separation between two user accounts
- Public catalogue reads and denied browser catalogue writes
- The strict Realtime Database rules
- A dry run and live two-record catalogue import
- The final test, lint, and production build commands

Final commands run:

```powershell
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
```

All three commands completed successfully.

I did not directly edit the application source code. My contribution consisted of choosing the requirements and design direction, configuring OMDb and Firebase, testing the generated application, debugging integration problems, verifying security behaviour, and documenting the process.
