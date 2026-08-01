# Strex — Student-Directed Improvements and Verification Record

**Project:** Strex  
**Development tools:** ChatGPT and Codex in VS Code

## Purpose of this file

This document records the product decisions and improvements I requested during development, together with the service configuration and live testing I completed.

The complete verbatim prompts sent to Codex are stored in [`AI_PROMPTS.md`](AI_PROMPTS.md).

> I did not directly edit the application source code. The changes below were selected and requested by me, then implemented with AI assistance. My direct hands-on work consisted of configuring OMDb and Firebase, testing the application, debugging integrations, verifying security behaviour, and documenting the process.

## Main requests I gave to ChatGPT

### Understand the assignment

> what should i do

I used ChatGPT to understand the required application, AI prompt record, review evidence, and submission documentation.

### Identify the mentor application

> can i give u the link to the session and u tell me what is the the app?

I supplied the mentor-session link so the demonstrated movie-search and favourites application could be identified.

### Generate a Codex implementation prompt

> give me a prompt for codex in vscode to build a similar app

I asked for a detailed prompt that Codex could use to create the project directly in VS Code.

### Define the visual direction

> i want the style to be similar to this site ... dont tell codex to do the same like this site and give its name just describe how does it look like

I requested an original cinematic interface based on general visual qualities, without copying branding, assets, wording, or a pixel-for-pixel layout.

### Connect OMDb and Firebase

> the site now opens but we need to connect the api and the firebase

I requested live OMDb movie data, Firebase Authentication, Realtime Database, and security rules.

### Import selected catalogue data

> i want codex to claim data from IMDb and add it to the database

This was implemented safely by using the documented OMDb API and IMDb IDs rather than scraping IMDb pages. A trusted Firebase Admin script writes normalized records to `/catalog`.

### Request the final feature and design changes

I requested:

- Sliding featured-series cards with a poster, atmospheric background, description, details action, favourite action, and watchlist action
- Preservation of the existing homepage categories below the carousel
- A Watchlist button and protected Watchlist page
- A profile page for first name, last name, region, and phone number
- Softer colours that are more comfortable to view
- A profile display that shows the first name rather than the full email
- Google sign-in

### Rebrand the site

> change the site name to strex

I selected **Strex** as the public-facing application name. Existing Firebase identifiers were intentionally kept unchanged to avoid breaking the configured backend.

## Student-directed improvements

### 1. Strex branding

**Before:** The public-facing name was ReelVault.  
**Requested change:** Rename visible branding and documentation to **Strex**.  
**Reason:** Give the project an original identity selected by me.  
**Implementation:** AI-assisted.

### 2. Featured-series carousel

**Before:** The homepage began with normal discovery rows.  
**Requested change:** Add a cinematic featured-series carousel before those rows.  
**Reason:** Make the homepage more engaging while keeping the existing categories.  
**Implementation:** AI-assisted.

### 3. Separate Watchlist

**Before:** Users could only save favourites.  
**Requested change:** Add a separate Watchlist route, navigation link, controls, and Firebase data path.  
**Reason:** Separate titles a user likes from titles they plan to watch.  
**Implementation:** AI-assisted.

### 4. Profile editor

**Before:** The account mainly used the authentication email.  
**Requested change:** Add editable first name, last name, region, and phone number fields.  
**Reason:** Improve personalization and support a cleaner account display.  
**Implementation:** AI-assisted.

### 5. First-name account display

**Before:** The navigation displayed the full email address.  
**Requested change:** Show the first name and use the Google photo, initials, or a fallback profile icon.  
**Reason:** Make the navigation cleaner and more personal.  
**Implementation:** AI-assisted.

### 6. Softer visual palette

**Before:** The interface used very dark surfaces and stronger purple contrast.  
**Requested change:** Use dark slate surfaces, warm off-white text, muted lavender accents, and gentler shadows and borders.  
**Reason:** Reduce visual harshness while keeping the cinematic style.  
**Implementation:** AI-assisted.

### 7. Google sign-in

**Before:** Authentication supported Email/Password only.  
**Requested change:** Add Google authentication through Firebase.  
**Reason:** Make sign-in faster and more convenient.  
**Implementation:** AI-assisted frontend code plus manual Firebase provider configuration.

## Manual configuration completed

I manually completed the following tasks:

- Activated and tested the OMDb API key
- Created the Firebase project and registered the web application
- Added the Firebase web configuration to `.env.local`
- Enabled Email/Password and Google authentication
- Created the Realtime Database
- Published the strict rules from `firebase-database-rules.json`
- Generated and safely stored the Firebase Admin service-account file
- Configured the catalogue importer environment variables

## Manual verification completed

I manually verified:

- Live OMDb homepage, search, and movie-detail requests
- Email/Password registration and login
- Google sign-in
- Profile saving and first-name display in the navigation
- Adding, restoring, and removing favourites
- Adding, restoring, and removing watchlist items
- Private-data separation between two user accounts
- Public catalogue reads while signed out
- Rejected browser writes to `/catalog`
- A dry-run catalogue import
- A live two-record catalogue import

I also ran:

```powershell
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
```

All three commands completed successfully.

## Authorship statement

I did not directly edit the application source code. I selected the requirements, requested the design and feature changes, configured the external services, tested the generated application, debugged integration issues with AI guidance, verified the database security behaviour, and prepared the documentation.

The project should therefore be described as **student-directed and AI-assisted**, with manual configuration, testing, and verification performed by me.
