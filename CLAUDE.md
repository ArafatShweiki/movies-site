# AI Development Guidelines

## Project

This project is a frontend capstone focused on building a modern web application with AI-assisted development.

## Tech Stack

- React
- TypeScript
- CSS
- REST APIs
- Git & GitHub

## Code Style

- Use functional React components.
- Prefer TypeScript interfaces over `any`.
- Keep components small and reusable.
- Use descriptive variable and function names.
- Avoid duplicated code.
- Write clean, readable, and maintainable code.

## Folder Structure

- `components/` – reusable UI components
- `pages/` – application pages
- `hooks/` – custom React hooks
- `services/` – API calls
- `utils/` – helper functions
- `assets/` – images and static files

## AI Guidelines

When generating code:

- Follow existing project conventions.
- Generate production-ready React code.
- Follow the styling approach already used by the project. Do not introduce Tailwind CSS unless the project already uses it or the task requires it.
- Avoid unnecessary dependencies.
- Explain complex logic when requested.
- Keep components modular.
- Prioritize accessibility and performance.

## Git Workflow

- Create a feature branch for each task.
- Write meaningful commit messages.
- Keep commits focused on one change.
- Merge only tested code.

## Testing Checklist

Before committing:

- Project builds successfully.
- No TypeScript errors.
- No ESLint errors.
- Components are responsive.
- New features do not break existing functionality.

## AI Assistant Behavior

When assisting with development:

- Ask for clarification when requirements are unclear.
- Explain proposed changes before making major modifications.
- Preserve existing functionality when modifying code.
- Suggest improvements while respecting the current project architecture.
- Provide concise explanations with code examples when helpful.
- Avoid making assumptions about dependencies or project structure.

## Project Rules Learned from the AI Workflow Exercise

1. Every new form must include automated tests for required fields, invalid formats, edge cases, successful submission, reset behavior, and accessibility attributes.

2. Form errors must be displayed beside the correct field and connected using `aria-invalid` and `aria-describedby`. Related controls should use semantic elements such as `fieldset` and `legend`.

3. Interactive settings must change the actual interface, not only update state. Features such as Light, Dark, and System themes must be tested manually and with automated tests.

4. After implementing a feature, run the tests, linter, and production build. Do not report that verification passed without running the commands.

5. Do not commit local dependencies, build output, or cache folders such as `node_modules`, `dist`, and `.vite`. Commit source files and `package-lock.json`.