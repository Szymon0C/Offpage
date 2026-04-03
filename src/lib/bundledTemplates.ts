// src/lib/bundledTemplates.ts

export interface BundledTemplate {
  id: string;
  name: string;
  category: 'landing' | 'portfolio' | 'blog' | 'ecommerce';
  version: string;
  html: string;
}

export const BUNDLED_TEMPLATES: BundledTemplate[] = [
  {
    id: 'tpl-landing-startup',
    name: 'Startup Landing',
    category: 'landing',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Startup Name</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;line-height:1.6}
header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:80px 20px;text-align:center}
header h1{font-size:3rem;margin-bottom:16px;font-weight:800}
header p{font-size:1.25rem;opacity:0.9;max-width:600px;margin:0 auto 32px}
header a{display:inline-block;background:#fff;color:#667eea;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.1rem;transition:transform 0.2s}
header a:hover{transform:translateY(-2px)}
section{padding:80px 20px;max-width:1000px;margin:0 auto}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px}
.feature{background:#f8f9ff;padding:32px;border-radius:12px}
.feature h3{font-size:1.25rem;margin-bottom:8px;color:#667eea}
.feature p{color:#555;font-size:0.95rem}
footer{background:#1a1a2e;color:#aaa;text-align:center;padding:40px 20px;font-size:0.9rem}
</style>
</head>
<body>
<header>
<h1>Build Something Amazing</h1>
<p>The fastest way to launch your next big idea. Simple, powerful, and designed for teams that move fast.</p>
<a href="#features">Get Started Free</a>
</header>
<section id="features">
<h2 style="text-align:center;font-size:2rem;margin-bottom:48px">Why Choose Us</h2>
<div class="features">
<div class="feature"><h3>Lightning Fast</h3><p>Optimized for speed from the ground up. Your users will notice the difference immediately.</p></div>
<div class="feature"><h3>Easy to Use</h3><p>No technical knowledge required. Get up and running in minutes, not hours.</p></div>
<div class="feature"><h3>Secure by Default</h3><p>Enterprise-grade security built in. Your data is encrypted and protected at every level.</p></div>
</div>
</section>
<footer>&copy; 2026 Startup Name. All rights reserved.</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-portfolio-minimal',
    name: 'Minimal Portfolio',
    category: 'portfolio',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#222;background:#fafafa}
header{padding:60px 20px;max-width:800px;margin:0 auto}
header h1{font-size:2.5rem;font-weight:800;margin-bottom:8px}
header p{color:#666;font-size:1.1rem}
nav{display:flex;gap:24px;margin-top:24px}
nav a{color:#222;text-decoration:none;font-weight:500;border-bottom:2px solid transparent;padding-bottom:4px;transition:border-color 0.2s}
nav a:hover{border-color:#222}
section{padding:40px 20px;max-width:800px;margin:0 auto}
.projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;margin-top:24px}
.project{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.project-img{height:200px;background:#e8e8e8;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.9rem}
.project-info{padding:20px}
.project-info h3{font-size:1.1rem;margin-bottom:4px}
.project-info p{color:#888;font-size:0.85rem}
footer{padding:60px 20px;max-width:800px;margin:0 auto;color:#999;font-size:0.85rem;border-top:1px solid #eee}
</style>
</head>
<body>
<header>
<h1>Jane Designer</h1>
<p>Product designer crafting thoughtful digital experiences.</p>
<nav><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
</header>
<section id="work">
<h2 style="font-size:1.5rem">Selected Work</h2>
<div class="projects">
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>Brand Redesign</h3><p>Visual identity &middot; 2026</p></div></div>
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>Mobile App</h3><p>UI/UX Design &middot; 2025</p></div></div>
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>E-commerce Platform</h3><p>Web Design &middot; 2025</p></div></div>
</div>
</section>
<footer>&copy; 2026 Jane Designer</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-blog-clean',
    name: 'Clean Blog',
    category: 'blog',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Blog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;color:#333;background:#fff;line-height:1.8}
header{padding:48px 20px;max-width:680px;margin:0 auto;border-bottom:1px solid #eee}
header h1{font-size:2rem;font-weight:700;margin-bottom:4px}
header p{color:#888;font-size:0.95rem}
main{max-width:680px;margin:0 auto;padding:40px 20px}
article{margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid #f0f0f0}
article:last-child{border-bottom:none}
article h2{font-size:1.5rem;margin-bottom:8px}
article h2 a{color:#333;text-decoration:none}
article h2 a:hover{color:#667eea}
.meta{color:#999;font-size:0.85rem;margin-bottom:16px;font-family:system-ui,sans-serif}
article p{color:#555}
footer{max-width:680px;margin:0 auto;padding:40px 20px;color:#bbb;font-size:0.8rem;font-family:system-ui,sans-serif;border-top:1px solid #eee}
</style>
</head>
<body>
<header>
<h1>Thoughts & Words</h1>
<p>A personal blog about design, technology, and life.</p>
</header>
<main>
<article><h2><a href="#">The Art of Simplicity</a></h2><div class="meta">March 15, 2026 &middot; 5 min read</div><p>Simplicity is the ultimate sophistication. In a world overwhelmed by complexity, the ability to distill ideas to their essence is more valuable than ever. This post explores how minimalism in design leads to better user experiences.</p></article>
<article><h2><a href="#">Building for the Future</a></h2><div class="meta">March 8, 2026 &middot; 8 min read</div><p>Technology moves fast, but good design principles remain constant. Here are the timeless patterns I keep coming back to when building products that need to last.</p></article>
<article><h2><a href="#">Morning Routines That Work</a></h2><div class="meta">February 28, 2026 &middot; 4 min read</div><p>After years of experimentation, I've found a morning routine that actually sticks. It's simpler than you'd think and doesn't require waking up at 5 AM.</p></article>
</main>
<footer>&copy; 2026 Thoughts & Words</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-ecommerce-store',
    name: 'Product Store',
    category: 'ecommerce',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Store</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 32px;border-bottom:1px solid #eee}
header h1{font-size:1.4rem;font-weight:800}
header nav{display:flex;gap:24px}
header nav a{color:#555;text-decoration:none;font-size:0.9rem}
header nav a:hover{color:#1a1a1a}
.hero{background:#f5f5f5;padding:80px 32px;text-align:center}
.hero h2{font-size:2.5rem;font-weight:800;margin-bottom:12px}
.hero p{color:#666;font-size:1.1rem;margin-bottom:32px}
.hero a{display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;transition:background 0.2s}
.hero a:hover{background:#333}
.products{max-width:1100px;margin:0 auto;padding:60px 20px}
.products h2{text-align:center;font-size:1.8rem;margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px}
.product{border:1px solid #eee;border-radius:12px;overflow:hidden;transition:box-shadow 0.2s}
.product:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.product-img{height:220px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.85rem}
.product-info{padding:16px}
.product-info h3{font-size:1rem;margin-bottom:4px}
.product-info .price{font-weight:700;color:#1a1a1a;font-size:1.1rem}
.product-info .old-price{text-decoration:line-through;color:#999;font-size:0.85rem;margin-left:8px}
footer{background:#1a1a1a;color:#999;padding:40px 32px;text-align:center;font-size:0.85rem;margin-top:60px}
</style>
</head>
<body>
<header><h1>STORE</h1><nav><a href="#">Shop</a><a href="#">Collections</a><a href="#">About</a><a href="#">Cart (0)</a></nav></header>
<section class="hero">
<h2>New Season Arrivals</h2>
<p>Discover our latest collection of premium products.</p>
<a href="#products">Shop Now</a>
</section>
<section class="products" id="products">
<h2>Featured Products</h2>
<div class="grid">
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Classic White Tee</h3><p><span class="price">$49</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Leather Backpack</h3><p><span class="price">$129</span><span class="old-price">$159</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Minimalist Watch</h3><p><span class="price">$199</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Canvas Sneakers</h3><p><span class="price">$89</span></p></div></div>
</div>
</section>
<footer>&copy; 2026 STORE. All rights reserved.</footer>
</body>
</html>`,
  },
];
