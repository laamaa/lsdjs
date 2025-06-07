# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating build and deployment processes.

## Workflows

### `deploy.yml`

This workflow automatically builds and deploys the LSDPatcher web application to GitHub Pages.

#### Triggers
- Push to the `main` branch
- Manual trigger via GitHub Actions interface (workflow_dispatch)

#### What it does
1. Sets up a Node.js v22 environment
2. Installs dependencies using `npm ci`
3. Builds the project using `npm run build`
4. Deploys the built application to GitHub Pages

#### Configuration
- The workflow uses the contents of the `web-application/build` directory for deployment
- Only one deployment can run at a time (concurrent deployments are canceled)
- Proper permissions are set for GitHub Pages deployment

## Setting up GitHub Pages

To use this workflow, you need to:

1. Go to your repository settings
2. Navigate to "Pages" section
3. Under "Build and deployment", select "GitHub Actions" as the source
4. The site will be deployed automatically when changes are pushed to the main branch

## Manual Deployment

You can manually trigger a deployment by:
1. Going to the "Actions" tab in your repository
2. Selecting the "Build and Deploy to GitHub Pages" workflow
3. Clicking "Run workflow"