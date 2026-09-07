# Contributing to FuelFinder Italy ⛽

Thank you for your interest in contributing to FuelFinder Italy! We welcome contributions, bug fixes, feature proposals, and documentation improvements.

---

## 🛠️ Development Environment

Ensure you have the following prerequisites installed:

- **Node.js**: `>= 22.0.0` (LTS recommended)
- **pnpm**: `>= 10.0.0` (Package manager)
- **Git**

### Setup Steps

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/<your-username>/FuelFinder-Italy.git
   cd FuelFinder-Italy
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Start local development server:**

   ```bash
   pnpm run dev
   ```

   This will concurrently launch the Vite frontend development server (`http://localhost:5173`) and the Express backend server with SQLite (`http://localhost:3000`).

---

## 🧪 Testing & Code Quality

Before committing or submitting a Pull Request, make sure all checks pass locally:

- **Linter (Oxlint):**

  ```bash
  pnpm run lint
  # To auto-fix issues:
  pnpm run lint:fix
  ```

- **Unit & Integration Tests:**

  ```bash
  pnpm run test
  # Or with coverage report:
  pnpm run test:coverage
  ```

- **Production Build Check:**

  ```bash
  pnpm run build
  ```

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification in **English**:

- `feat:` A new user-facing feature
- `fix:` A bug fix
- `docs:` Documentation changes only
- `style:` Formatting, missing semi colons, CSS cosmetics without logic change
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding or correcting tests
- `chore:` Maintenance tasks, dependency bumps, tooling configurations
- `ci:` Changes to CI configuration files and scripts

**Example:**

```bash
git commit -m "feat(map): add fast clustering support for fuel stations"
```

---

## 🔀 Branching Strategy & Pull Requests

1. Create a feature or fix branch from `main`:

   ```bash
   git checkout -b feat/my-new-feature
   ```

2. Make small, focused commits adhering to the commit guidelines.
3. Test your changes thoroughly.
4. Push your branch and open a Pull Request against `main`.
5. Clearly describe the changes and link any related issues (e.g. `Closes #12`).

---

## 📜 Code of Conduct

Please review and respect our [Code of Conduct](CODE_OF_CONDUCT.md) in all community interactions.
