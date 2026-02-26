# Gemini CLI Engineering Guidelines

These instructions take absolute precedence over general workflows and tool defaults.

## Development Workflow
1. **Plan First**: Always formulate a grounded plan based on research before execution. Identify dependencies, risks, and break down into phases.
2. **TDD Approach**: 
   - Write tests first (RED).
   - Implement minimal code to pass tests (GREEN).
   - Refactor (IMPROVE).
   - Verify minimum 80% test coverage.
3. **Code Review**: Critically evaluate your own code after writing it. Address critical and high issues immediately.
4. **Validation**: A task is only complete when the behavioral correctness of the change has been verified. Run tests empirically.

## Coding Style
- **Immutability (CRITICAL)**: ALWAYS create new objects, NEVER mutate existing ones (e.g., `update(original)` instead of `modify(original)`).
- **File Organization**: Favor many small files over few large files. High cohesion, low coupling. 200-400 lines typical, 800 max. Organize by feature/domain.
- **Error Handling**: Handle errors explicitly at every level. Do not silently swallow errors. Provide user-friendly messages for UI, detailed logs for servers.
- **Input Validation**: Validate all user input before processing. Fail fast.

## Security Guidelines
- **Mandatory Checks**: No hardcoded secrets (API keys, passwords, tokens). All user inputs validated. Prevent SQLi, XSS, CSRF. Implement rate limiting.
- **Secret Management**: ALWAYS use environment variables or a secret manager. NEVER hardcode.
- **Incident Protocol**: If a vulnerability is found, stop immediately, fix critical issues, rotate exposed secrets, and review the codebase.

## Git Workflow
- **Commit Messages**: Use Conventional Commits format (`<type>: <description>`). Types: feat, fix, refactor, docs, test, chore, perf, ci.
- **PRs/Commits**: Analyze full commit history (`git diff HEAD`). Ensure all relevant files are tracked. Propose a draft commit message focusing on "why" rather than just "what". Do not commit unless explicitly asked.

## Agent Skills
- Leverage built-in skills (like `skill-creator`) and sub-agents (`codebase_investigator`) proactively for complex architectural decisions, system-wide refactoring, and deep codebase analysis.
