# Development Guide

Internal notes for developers working on SpliceVarDB. For the external contribution process, see [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Repository layout

This repo is a static front-end site - plain HTML/CSS/jQuery, no build step or bundler.

```
index.html                 Main site page
static/css/                Stylesheets
static/js/                 Client-side logic (calls the /splicevardb-api backend)
resources/                 The /resources sub-page
publication_data/          Data + R notebook behind the SpliceVarDB paper figures (not part of the live site)
Dockerfile                 nginx image that serves the site
docker-compose.yml         Local run / production deploy target
nginx.conf                 nginx routing (SPA-style fallback, separate fallback for /resources)
bitbucket-pipelines.yml    CI/CD: builds and deploys on release tags
```

The variant database itself is **not** in this repo - it's served by a separate backend API (`/splicevardb-api`) and can be downloaded from https://splicevardb.org.

## Two repositories

| Repo | Role |
|---|---|
| [Bitbucket](https://bitbucket.org/cciacb/splicevardb) | **Source of truth.** All internal CCI development happens here. Releases are cut from here. |
| [GitHub](https://github.com/CCICB/SpliceVarDB) | **Public mirror.** Exists so external contributors can find the project and open PRs without needing Bitbucket access. |

Both remotes can be added to a single local clone, e.g.:

```bash
git remote add bitbucket git@bitbucket.org:cciacb/splicevardb.git
git remote add origin git@github.com:CCICB/SpliceVarDB.git
```

### Internal workflow (Bitbucket)

1. Branch off `main` (branches are often prefixed with the Jira ticket, e.g. `CW-10-pipelines`, but descriptive names like `fix-contact-form` are also used).
2. Open a PR against `main` on Bitbucket.
3. Get it reviewed and merged.

### Cutting a release

Production deploys are triggered by pushing a tag matching `release-v*` (see `bitbucket-pipelines.yml`), e.g. `release-v1.3.3`.

Tagging that pattern on Bitbucket `main` runs a pipeline that:

1. Runs on a self-hosted runner.
2. `scp`s the repo contents to the production server.
3. Runs `docker compose up -d --build` on the server (with secrets injected via Doppler).

So a release is: merge your PRs into `main` on Bitbucket → tag `main` with the next `release-v*` version → push the tag → pipeline builds and deploys.

### Mirroring to GitHub

There is **no automated sync** between Bitbucket and GitHub. After a release, a maintainer manually pushes Bitbucket `main` (and its tags) to GitHub:

```bash
git push origin main --tags
```

(where `origin` points at GitHub - see remotes above). Do this after the Bitbucket release has been merged and tagged, so GitHub never gets ahead of the internal source of truth.

## Handling external contributions

Anyone can open a PR against either repo (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

- **PR opened on Bitbucket**: reviewed and merged normally, as above.
- **PR opened on GitHub**: reviewed on GitHub, but since GitHub is a downstream mirror, the change is **not** merged directly there. Once approved, a CCI maintainer manually re-applies the change onto Bitbucket `main` (e.g. by cherry-picking the commit or applying it as a patch), so it goes through the same pipeline and release process as internal work. The GitHub PR is then closed/marked merged, and the change reaches GitHub for real on the next Bitbucket → GitHub mirror push.

## Local development

```bash
docker compose up --build
```

Serves the site at http://localhost:3000 via the same nginx image used in production. Since there's no build step, you can also just open `index.html` directly or serve the repo root with any static file server - the Docker route most closely matches production routing behavior (see `nginx.conf`), particularly around `/resources`.

Note the backend API (`/splicevardb-api`) is a separate service and isn't started by this compose file - pages that fetch live variant data won't return results unless that API is reachable.
