/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://hypastack.com',
  generateRobotsTxt: false, // We have custom robots.txt
  generateIndexSitemap: true,
  sitemapSize: 5000,
  changefreq: 'daily',
  priority: 0.7,
  trailingSlash: false,
  
  // Additional paths to include
  additionalPaths: async (config) => {
    return [
      {
        loc: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      },

      {
        loc: '/terms',
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/privacy',
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/acceptable-use',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/dmca',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/child-safety',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/coppa-gdpr',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/vulnerability-disclosure',
        changefreq: 'monthly',
        priority: 0.4,
        lastmod: new Date().toISOString(),
      },
    ]
  },
  
  // Exclude paths
  exclude: [
    '/api/*',
    '/_next/*',
    '/d/*', // Dynamic download pages
    '/policy', // Redirect page
    '/manage',
    '/manage/*',
    '/maintenance',
    '/experience',
    '/desktop',
    '/desktop/*',
    '/transfer',
    '/waitlist'
  ],
  
  // Transform function for additional customization
  transform: async (config, path) => {
    // Custom transformations based on path
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      }
    }
    

    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    }
  },
}
