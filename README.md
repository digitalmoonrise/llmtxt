# LLMs.txt Generator for Shopify

A Shopify app that automatically generates [llms.txt](https://llmstxt.org/) files for your store, making your e-commerce data more accessible to AI assistants and language models.

## What is llms.txt?

The `llms.txt` file is a standardized format that provides LLM-friendly information about websites. Following the [llms.txt specification](https://llmstxt.org/), this file helps AI assistants better understand your store's products, policies, and structure.

## Features

- **Automatic Generation**: Fetches store information and products via Shopify's GraphQL API
- **Specification Compliant**: Follows the official llms.txt format guidelines
- **Product Organization**: Groups products by type and includes pricing information
- **Store Policies**: Includes links to standard Shopify policy pages
- **Easy Export**: Copy to clipboard or download as a file
- **Real-time Updates**: Regenerate the file with current store data

## Generated Content

The app creates an llms.txt file that includes:

- Store name and description
- Store information (domain, currency, contact)
- Product catalog overview with statistics
- Organized product listings by category
- Store policy links (shipping, returns, privacy, terms)
- Optional sections for complete product catalogs

## Quick start

### Prerequisites

Before you begin, you'll need the following:

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) it if you haven't already.
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup) if you don't have one.
3. **Test Store**: Set up either a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or a [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store) for testing your app.

### Setup

Using npm:

```shell
npm install
```

### Local Development

```shell
npm run dev
```

Press P to open the URL to your app. Once you click install, you can start using the llms.txt generator.

## How to Use

1. **Install the App**: Install the app in your Shopify store
2. **Generate llms.txt**: The app automatically generates the file using your current store data
3. **Copy or Download**: Use the interface to copy the content to clipboard or download as a file
4. **Implement**: Place the `llms.txt` file in your website's root directory
5. **Verify**: Ensure the file is accessible at `yourstore.com/llms.txt`

## Implementation

To implement the generated llms.txt file on your website:

1. Copy the generated content from the app
2. Create a file named `llms.txt`
3. Place it in your website's root directory
4. Ensure it's accessible at `yourstore.com/llms.txt`

## Tech Stack

- **Framework**: [Remix](https://remix.run)
- **UI Components**: [Shopify Polaris](https://polaris.shopify.com)
- **API**: Shopify GraphQL Admin API
- **Database**: [Prisma](https://www.prisma.io/) with SQLite
- **Hosting**: Compatible with Vercel, Heroku, Fly.io, and other platforms

## API Usage

The app uses Shopify's GraphQL Admin API to fetch:

- Shop information (name, description, domain, currency)
- Product data (title, description, pricing, categories, vendors)
- Product variants and inventory information

## Deployment

### Build

```shell
npm run build
```

### Hosting

When you're ready to set up your app in production, you can follow [Shopify's deployment documentation](https://shopify.dev/docs/apps/deployment/web) to host your app on a cloud provider.

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

## About llms.txt Specification

This app follows the [llms.txt specification](https://llmstxt.org/) which includes:

- **H1 Header**: Project/site name
- **Blockquote**: Short summary
- **Sections**: Organized with H2 headers containing file lists
- **Optional Section**: Secondary information that can be skipped for shorter context

## Contributing

This app is built on the Shopify App Template for Remix. For more information about Shopify app development, visit the [Shopify Developer Documentation](https://shopify.dev/docs/apps).

## Troubleshooting

### Database tables don't exist

If you get this error:

```
The table `main.Session` does not exist in the current database.
```

Run the setup script:

```shell
npm run setup
```

### Navigating/redirecting breaks an embedded app

Embedded Shopify apps must maintain the user session. To avoid issues:

1. Use `Link` from `@remix-run/react` or `@shopify/polaris`
2. Use the `redirect` helper returned from `authenticate.admin`
3. Use `useSubmit` or `<Form/>` from `@remix-run/react`

## License

This project is based on the Shopify App Template and follows the same licensing terms.
