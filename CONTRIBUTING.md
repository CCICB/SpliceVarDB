# Contributing to SpliceVarDB

Thanks for your interest in improving [SpliceVarDB](https://splicevardb.org)! This repository holds the front-end website code. This guide covers how to get a local copy running and how to submit a change.

For internal Children's Cancer Institute (CCI) developer workflow (release process, repo mirroring, etc.), see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Where to contribute

This project lives in two places:

- **Bitbucket** (source of truth, internal CCI development): https://bitbucket.org/cciacb/splicevardb
- **GitHub** (public mirror): https://github.com/CCICB/SpliceVarDB

You're welcome to open a pull request against **either** repository - use whichever you already have an account on. There's no need to open the same PR twice.

Note that GitHub is a mirror of Bitbucket, so a PR opened on GitHub is reviewed there but is merged into the codebase by a CCI maintainer manually porting the change into Bitbucket `main` (see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for why). This means there may be a short delay between your GitHub PR being approved and it appearing merged.

## Making a change

1. Fork the repository (or create a branch, if you have write access).
2. Create a branch off `main` for your change.
3. Make your change. See [Local development](#local-development) below to preview it.
4. Open a pull request against `main` describing what changed and why.

## Local development

This is a static site (plain HTML, CSS, and jQuery) served by nginx - there's no build step or package manager.

The easiest way to run it locally is with Docker:

```bash
docker compose up --build
```

Then visit http://localhost:3000.

Notes:

- The site calls a backend API at `/splicevardb-api` for variant data. That API lives in a separate service that isn't part of this repository, so API-dependent pages (e.g. variant search) won't return real data unless you have access to a running backend or proxy requests to one. UI/styling/static content changes can be previewed without it.
- Key files:
  - `index.html` - main site page
  - `static/css/`, `static/js/` - styles and client-side logic
  - `resources/` - the resources sub-page
  - `publication_data/` - data and analysis code for the associated publication (not part of the live site)

## Code style

There's no linter or formatter configured. Please match the existing style (vanilla JS + jQuery, no build tooling) rather than introducing new frameworks or dependencies unless you've discussed it with maintainers first.

## License

By contributing, you agree that your contribution will be licensed under the project's [AGPLv3 license](LICENSE-AGPLv3.md).

## Questions

Open an issue on either repository, or contact us through the [SpliceVarDB website](https://splicevardb.org).
