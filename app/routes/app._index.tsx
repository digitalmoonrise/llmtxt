import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Banner,
  Spinner,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

interface ShopData {
  name: string;
  description?: string;
  url: string;
  email: string;
  domain: string;
  currencyCode: string;
  primaryDomain: string;
}

interface ProductData {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: string;
  totalInventory: number;
  variants: {
    price: string;
    compareAtPrice?: string;
  }[];
}

interface LoaderData {
  shop: ShopData;
  products: ProductData[];
  llmsTxt: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch shop information
  const shopResponse = await admin.graphql(`
    query getShop {
      shop {
        name
        description
        url
        email
        myshopifyDomain
        currencyCode
        primaryDomain {
          url
        }
      }
    }
  `);

  const shopData = await shopResponse.json();
  const shop = shopData.data.shop;

  // Fetch products
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            productType
            vendor
            tags
            status
            totalInventory
            variants(first: 10) {
              edges {
                node {
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((edge: any) => ({
    ...edge.node,
    variants: edge.node.variants.edges.map((variantEdge: any) => variantEdge.node)
  }));

  // Generate llms.txt content
  const llmsTxt = generateLlmsTxt(shop, products);

  return json({
    shop: {
      name: shop.name,
      description: shop.description,
      url: shop.url,
      email: shop.email,
      domain: shop.myshopifyDomain,
      currencyCode: shop.currencyCode,
      primaryDomain: shop.primaryDomain.url,
    },
    products,
    llmsTxt,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  // Re-fetch data and regenerate llms.txt
  const shopResponse = await admin.graphql(`
    query getShop {
      shop {
        name
        description
        url
        email
        myshopifyDomain
        currencyCode
        primaryDomain {
          url
        }
      }
    }
  `);

  const shopData = await shopResponse.json();
  const shop = shopData.data.shop;

  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            productType
            vendor
            tags
            status
            totalInventory
            variants(first: 10) {
              edges {
                node {
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((edge: any) => ({
    ...edge.node,
    variants: edge.node.variants.edges.map((variantEdge: any) => variantEdge.node)
  }));

  const llmsTxt = generateLlmsTxt(shop, products);

  return json({
    shop: {
      name: shop.name,
      description: shop.description,
      url: shop.url,
      email: shop.email,
      domain: shop.myshopifyDomain,
      currencyCode: shop.currencyCode,
      primaryDomain: shop.primaryDomain.url,
    },
    products,
    llmsTxt,
  });
};

function generateLlmsTxt(shop: any, products: any[]): string {
  const productTypes = [...new Set(products.map(p => p.productType).filter(Boolean))];
  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'ACTIVE').length;
  
  // Calculate price range
  const prices = products.flatMap(p => p.variants.map((v: any) => parseFloat(v.price)));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const description = shop.description || `${shop.name} is an e-commerce store offering ${totalProducts} products across ${productTypes.length} categories.`;

  let llmsTxt = `# ${shop.name}\n\n`;
  llmsTxt += `> ${description}\n\n`;
  
  llmsTxt += `**Store Information:**\n`;
  llmsTxt += `- Domain: ${shop.myshopifyDomain}\n`;
  llmsTxt += `- Primary URL: ${shop.primaryDomain.url}\n`;
  llmsTxt += `- Currency: ${shop.currencyCode}\n`;
  llmsTxt += `- Contact: ${shop.email}\n\n`;

  llmsTxt += `**Product Catalog Overview:**\n`;
  llmsTxt += `- Total Products: ${totalProducts}\n`;
  llmsTxt += `- Active Products: ${activeProducts}\n`;
  llmsTxt += `- Price Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)} ${shop.currencyCode}\n`;
  if (productTypes.length > 0) {
    llmsTxt += `- Product Categories: ${productTypes.join(', ')}\n`;
  }
  if (vendors.length > 0) {
    llmsTxt += `- Brands/Vendors: ${vendors.slice(0, 10).join(', ')}${vendors.length > 10 ? '...' : ''}\n`;
  }
  llmsTxt += `\n`;

  if (products.length > 0) {
    llmsTxt += `## Products\n\n`;
    
    // Group products by type for better organization
    const productsByType = products.reduce((acc, product) => {
      const type = product.productType || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(product);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(productsByType).forEach(([type, typeProducts]) => {
      const typedProducts = typeProducts as any[];
      if (typedProducts.length > 0) {
        llmsTxt += `### ${type}\n\n`;
        typedProducts.slice(0, 10).forEach((product: any) => {
          const price = product.variants[0]?.price ? `$${product.variants[0].price}` : 'Price varies';
          const description = product.description ? 
            (product.description.length > 100 ? 
              product.description.substring(0, 100) + '...' : 
              product.description) : 
            'No description available';
          
          llmsTxt += `- **${product.title}** (${price}): ${description}\n`;
        });
        
        if (typedProducts.length > 10) {
          llmsTxt += `- *...and ${typedProducts.length - 10} more ${type.toLowerCase()} products*\n`;
        }
        llmsTxt += `\n`;
      }
    });
  }

  llmsTxt += `## Store Policies\n\n`;
  llmsTxt += `- [Shipping Policy](${shop.primaryDomain.url}/policies/shipping-policy): Information about shipping methods, costs, and delivery times\n`;
  llmsTxt += `- [Return Policy](${shop.primaryDomain.url}/policies/refund-policy): Details about returns, exchanges, and refunds\n`;
  llmsTxt += `- [Privacy Policy](${shop.primaryDomain.url}/policies/privacy-policy): How customer data is collected and used\n`;
  llmsTxt += `- [Terms of Service](${shop.primaryDomain.url}/policies/terms-of-service): Terms and conditions for using the store\n\n`;

  llmsTxt += `## Optional\n\n`;
  llmsTxt += `- [All Products](${shop.primaryDomain.url}/collections/all): Complete product catalog\n`;
  llmsTxt += `- [Contact Page](${shop.primaryDomain.url}/pages/contact): Store contact information and inquiry form\n`;

  return llmsTxt;
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [copied, setCopied] = useState(false);

  const shopify = useAppBridge();
  const isLoading = ["loading", "submitting"].includes(fetcher.state);
  
  // Use fetcher data if available, otherwise use loader data
  const currentData = fetcher.data || data;

  useEffect(() => {
    if (fetcher.data) {
      shopify.toast.show("llms.txt regenerated successfully");
    }
  }, [fetcher.data, shopify]);

  const regenerateLlmsTxt = () => {
    fetcher.submit({}, { method: "POST" });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentData.llmsTxt);
      setCopied(true);
      shopify.toast.show("llms.txt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      shopify.toast.show("Failed to copy to clipboard", { isError: true });
    }
  };

  const downloadFile = () => {
    const blob = new Blob([currentData.llmsTxt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llms.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    shopify.toast.show("llms.txt file downloaded");
  };

  return (
    <Page>
      <TitleBar title="LLMs.txt Generator">
        <button variant="primary" onClick={regenerateLlmsTxt} disabled={isLoading}>
          {isLoading ? "Regenerating..." : "Regenerate llms.txt"}
        </button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Banner title="About llms.txt" tone="info">
          <Text as="p" variant="bodyMd">
            The llms.txt file provides LLM-friendly information about your store, following the{" "}
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              llms.txt specification
            </a>
            . This helps AI assistants better understand your store's products, policies, and structure.
          </Text>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Generated llms.txt for {currentData.shop.name}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This file contains information about your store with {currentData.products.length} products.
                    Place this content in a file called <code>llms.txt</code> in your website's root directory.
                  </Text>
                </BlockStack>

                <InlineStack gap="300">
                  <Button 
                    onClick={copyToClipboard}
                    variant={copied ? "primary" : "secondary"}
                  >
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </Button>
                  <Button onClick={downloadFile}>
                    Download llms.txt
                  </Button>
                  <Button 
                    loading={isLoading} 
                    onClick={regenerateLlmsTxt}
                    variant="primary"
                  >
                    Regenerate
                  </Button>
                </InlineStack>

                <Divider />

                <Box
                  padding="400"
                  background="bg-surface-active"
                  borderWidth="025"
                  borderRadius="200"
                  borderColor="border"
                  overflowX="scroll"
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.4' }}>
                    <code>{currentData.llmsTxt}</code>
                  </pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Store Overview
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Store Name
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {currentData.shop.name}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Domain
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {currentData.shop.domain}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Products
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {currentData.products.length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Currency
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {currentData.shop.currencyCode}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Implementation
                  </Text>
                  <Text as="p" variant="bodyMd">
                    To implement this on your website:
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd">
                      1. Copy the generated content above
                    </Text>
                    <Text as="p" variant="bodyMd">
                      2. Create a file named <code>llms.txt</code>
                    </Text>
                    <Text as="p" variant="bodyMd">
                      3. Place it in your website's root directory
                    </Text>
                    <Text as="p" variant="bodyMd">
                      4. Ensure it's accessible at <code>yourstore.com/llms.txt</code>
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
