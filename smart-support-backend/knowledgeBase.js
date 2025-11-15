/**
 * Knowledge Base - FAQs, Policies, and Product Information
 * This file contains the documents that will be ingested into the RAG system
 */

const knowledgeBase = [
  // ==================== SHIPPING & DELIVERY ====================
  {
    id: 'shipping-001',
    text: 'Standard shipping takes 3-5 business days from order confirmation. Express shipping is available for an additional fee and delivers within 1-2 business days. We ship Monday through Friday, excluding public holidays. Orders placed after 2 PM are processed the next business day.',
    metadata: {
      category: 'Shipping',
      source: 'Shipping Policy',
      tags: ['delivery', 'timeline', 'standard', 'express']
    }
  },
  {
    id: 'shipping-002',
    text: 'You can track your order using the tracking number sent to your email. Simply go to our website, click on "Track Order" in the navigation menu, and enter your order number and email address. You will see real-time updates on your shipment location and estimated delivery time.',
    metadata: {
      category: 'Shipping',
      source: 'Order Tracking Guide',
      tags: ['tracking', 'order status', 'delivery updates']
    }
  },
  {
    id: 'shipping-003',
    text: 'If your package is delayed beyond the estimated delivery date, first check the tracking information for any updates. Weather conditions, customs delays, or high volume periods can cause delays. If your order is delayed by more than 2 business days past the estimated delivery, contact our support team with your order number for assistance.',
    metadata: {
      category: 'Shipping',
      source: 'Delivery Issues FAQ',
      tags: ['delayed delivery', 'late shipment', 'shipping problems']
    }
  },
  {
    id: 'shipping-004',
    text: 'We offer free standard shipping on orders over $50. Orders under $50 have a flat shipping fee of $5.99 for standard delivery. Express shipping costs $14.99 regardless of order amount. International shipping rates vary by destination and are calculated at checkout.',
    metadata: {
      category: 'Shipping',
      source: 'Shipping Rates',
      tags: ['shipping cost', 'free shipping', 'delivery fees']
    }
  },

  // ==================== RETURNS & REFUNDS ====================
  {
    id: 'return-001',
    text: 'We offer free returns within 7 days of delivery for all unused products with original tags and packaging intact. To initiate a return, log into your account, go to "My Orders", select the order, and click "Request Return". You will receive a prepaid return shipping label via email.',
    metadata: {
      category: 'Returns',
      source: 'Return Policy',
      tags: ['return policy', 'return window', 'return process']
    }
  },
  {
    id: 'return-002',
    text: 'Refunds are processed within 5-7 business days after we receive and inspect your returned item. The refund will be credited to your original payment method. If you paid by credit card, it may take an additional 2-3 billing cycles for the credit to appear on your statement, depending on your bank.',
    metadata: {
      category: 'Returns',
      source: 'Refund Timeline',
      tags: ['refund processing', 'refund time', 'payment reversal']
    }
  },
  {
    id: 'return-003',
    text: 'Items that cannot be returned include: intimate apparel, swimwear, earrings, final sale items marked as such, and products that have been used, washed, or damaged. Gift cards are also non-returnable. If you received a damaged or defective product, contact us within 48 hours of delivery for a replacement.',
    metadata: {
      category: 'Returns',
      source: 'Return Restrictions',
      tags: ['non-returnable', 'return exceptions', 'damaged items']
    }
  },
  {
    id: 'return-004',
    text: 'If you want to exchange an item for a different size or color, we recommend returning the original item for a refund and placing a new order. This ensures you get your preferred item quickly. However, if the exchange is for a defective or damaged product, contact our support team who can process a direct exchange.',
    metadata: {
      category: 'Returns',
      source: 'Exchange Policy',
      tags: ['exchange', 'size change', 'color change', 'swap']
    }
  },

  // ==================== PAYMENT & BILLING ====================
  {
    id: 'payment-001',
    text: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), debit cards, PayPal, Apple Pay, Google Pay, and shop pay. All payments are processed securely through encrypted connections. We do not store your complete credit card information on our servers.',
    metadata: {
      category: 'Payment',
      source: 'Payment Methods',
      tags: ['payment options', 'credit card', 'digital wallet']
    }
  },
  {
    id: 'payment-002',
    text: 'If your payment fails, first verify that your billing information matches what your bank has on file. Check that you have sufficient funds or credit available. Also ensure your card has not expired. If the problem persists, try a different payment method or contact your bank to ensure they are not blocking the transaction.',
    metadata: {
      category: 'Payment',
      source: 'Payment Troubleshooting',
      tags: ['payment declined', 'payment failed', 'transaction error']
    }
  },
  {
    id: 'payment-003',
    text: 'You will receive an email receipt immediately after your order is confirmed. The receipt includes your order number, items purchased, prices, shipping address, and total amount charged. You can also view and download receipts from your account dashboard under "Order History".',
    metadata: {
      category: 'Payment',
      source: 'Receipts & Invoices',
      tags: ['receipt', 'invoice', 'order confirmation']
    }
  },

  // ==================== ACCOUNT & PROFILE ====================
  {
    id: 'account-001',
    text: 'To create an account, click "Sign Up" in the top right corner of our website. Enter your email address and create a password. You can also sign up using your Google or Facebook account. Having an account allows you to track orders, save addresses, view order history, and receive exclusive offers.',
    metadata: {
      category: 'Account',
      source: 'Account Setup',
      tags: ['sign up', 'create account', 'registration']
    }
  },
  {
    id: 'account-002',
    text: 'If you forgot your password, click "Forgot Password" on the login page. Enter your email address and we will send you a password reset link. The link expires after 24 hours for security. If you do not receive the email, check your spam folder or try requesting another reset link.',
    metadata: {
      category: 'Account',
      source: 'Password Reset',
      tags: ['forgot password', 'reset password', 'login issues']
    }
  },
  {
    id: 'account-003',
    text: 'You can update your profile information, shipping addresses, and payment methods by logging into your account and going to "Account Settings". Changes to your email address will require email verification. To update your password, you will need to enter your current password first.',
    metadata: {
      category: 'Account',
      source: 'Account Management',
      tags: ['update profile', 'change address', 'account settings']
    }
  },

  // ==================== PRODUCTS & SIZING ====================
  {
    id: 'product-001',
    text: 'Our sizing guide is available on each product page. Click on "Size Guide" next to the size selector. We provide measurements in both inches and centimeters. For clothing, we include chest, waist, hip, and length measurements. For shoes, refer to our shoe size conversion chart. If you are between sizes, we recommend sizing up.',
    metadata: {
      category: 'Products',
      source: 'Sizing Guide',
      tags: ['size guide', 'measurements', 'fit']
    }
  },
  {
    id: 'product-002',
    text: 'You can check product availability by visiting the product page. If an item is out of stock, you will see "Out of Stock" next to the size or color option. You can click "Notify Me" to receive an email when the item is restocked. Popular items typically restock within 2-3 weeks.',
    metadata: {
      category: 'Products',
      source: 'Stock Information',
      tags: ['out of stock', 'availability', 'restock']
    }
  },
  {
    id: 'product-003',
    text: 'All our products come with care instructions on the label. Generally, machine wash cold with similar colors and tumble dry low. For delicate items like silk or wool, hand wash or dry clean only. Avoid using bleach unless specified. Iron on appropriate heat settings based on fabric type.',
    metadata: {
      category: 'Products',
      source: 'Care Instructions',
      tags: ['product care', 'washing', 'maintenance']
    }
  },

  // ==================== PROMOTIONS & DISCOUNTS ====================
  {
    id: 'promo-001',
    text: 'To use a promo code, add items to your cart and proceed to checkout. On the payment page, you will see a field labeled "Promo Code" or "Discount Code". Enter your code and click "Apply". The discount will be reflected in your order total. Only one promo code can be used per order.',
    metadata: {
      category: 'Promotions',
      source: 'Discount Codes',
      tags: ['promo code', 'coupon', 'discount']
    }
  },
  {
    id: 'promo-002',
    text: 'Our loyalty program rewards you with points for every purchase. Earn 1 point for every dollar spent. Gold tier members earn 1.5 points per dollar and receive exclusive early access to sales. Redeem points for discounts: 100 points = $10 off. Join by creating an account.',
    metadata: {
      category: 'Promotions',
      source: 'Loyalty Program',
      tags: ['rewards', 'loyalty points', 'membership tiers']
    }
  },

  // ==================== CUSTOMER SERVICE ====================
  {
    id: 'service-001',
    text: 'Our customer service team is available Monday through Friday, 9 AM to 6 PM EST. You can reach us by phone at 1-800-555-0123, by email at support@smartsense.com, or through live chat on our website. Average response time for emails is 2-4 hours during business hours.',
    metadata: {
      category: 'Customer Service',
      source: 'Contact Information',
      tags: ['contact support', 'customer service hours', 'help']
    }
  },
  {
    id: 'service-002',
    text: 'For complex issues that require escalation, our specialized support team will handle your case. Escalation typically occurs for: payment disputes, multiple failed deliveries, damaged products with photos, or cases requiring management approval. You will be assigned a case number and a dedicated representative.',
    metadata: {
      category: 'Customer Service',
      source: 'Escalation Process',
      tags: ['escalation', 'complex issues', 'case management']
    }
  },

  // ==================== TECHNICAL ISSUES ====================
  {
    id: 'tech-001',
    text: 'If you are experiencing issues with our website, try clearing your browser cache and cookies, then refresh the page. Make sure you are using an updated browser version. We support Chrome, Firefox, Safari, and Edge. If problems persist, try using incognito/private browsing mode or a different device.',
    metadata: {
      category: 'Technical',
      source: 'Website Troubleshooting',
      tags: ['website issues', 'technical problems', 'browser']
    }
  },
  {
    id: 'tech-002',
    text: 'Our mobile app is available for iOS and Android devices. Download from the App Store or Google Play Store. The app offers exclusive app-only deals, easier checkout with saved information, push notifications for order updates, and augmented reality features to preview products in your space.',
    metadata: {
      category: 'Technical',
      source: 'Mobile App',
      tags: ['app', 'mobile', 'download']
    }
  },

  // ==================== PRODUCT CATALOG ====================
  {
    id: 'product-headphones-nc500',
    text: 'Noise Cancelling Headphones NC500 Pro: Our flagship audio product featuring industry-leading hybrid active noise cancellation with 4 external microphones and proprietary AudioClear AI technology that adapts to your environment in real-time. Equipped with 40mm dynamic drivers delivering deep bass and crystal-clear highs across 20Hz-40kHz frequency range. Battery life is exceptional at 35 hours with ANC on, 50 hours with ANC off, and quick charge gives you 5 hours playback from just 10 minutes charging via USB-C. Supports LDAC, aptX HD, and AAC codecs for studio-quality wireless audio over Bluetooth 5.3 with multipoint connection to 2 devices simultaneously. Premium memory foam ear cushions with protein leather provide all-day comfort. Foldable design with hard-shell carrying case. Includes 3.5mm cable for wired use, airplane adapter, and USB-C cable. Available in Midnight Black, Silver Gray, and Ocean Blue. Weight: 250g. Comes with 2-year warranty. Perfect for travelers, remote workers, audiophiles, and anyone seeking peace in noisy environments. Compatible with iOS, Android, Windows, Mac. Voice assistant support for Siri, Google Assistant, and Alexa.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Audio',
      tags: ['headphones', 'noise cancelling', 'bluetooth', 'audio', 'wireless', 'anc', 'premium'],
      productId: 'NC500',
      productName: 'Noise Cancelling Headphones NC500 Pro',
      price: '$299',
      inStock: true
    }
  },
  {
    id: 'product-shoes-runner-elite',
    text: 'Runner Elite Performance Shoes: Engineered for serious runners with our proprietary FlexFoam cushioning system that provides 30% more energy return than standard EVA foam. The breathable engineered mesh upper with targeted support zones keeps your feet cool during long runs while providing stability. Features our patented GripTech rubber outsole with multi-directional traction patterns optimized for road running, wet conditions, and light trail use. Heel-to-toe drop is 8mm promoting natural foot strike. Reflective elements on heel and sides for night running visibility. Removable OrthoLite insole with antimicrobial treatment prevents odor. Reinforced toe cap for durability. Weighs only 240g (size 9). Available in sizes US 6-15 including half sizes and wide fit options. Color options: Midnight Black/Neon Yellow, Navy Blue/Orange Burst, Storm Gray/Electric Pink, Pure White/Silver. Recommended for neutral pronators and mild overpronators. Average lifespan: 400-500 miles. Designed in collaboration with Olympic marathon runners. Vegan-friendly materials. Machine washable on gentle cycle. Comes with extra set of laces and shoe bag. 90-day comfort guarantee.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Footwear',
      tags: ['shoes', 'running', 'athletic', 'sports', 'performance', 'marathon', 'training'],
      productId: 'RE-2024',
      productName: 'Runner Elite Performance Shoes',
      price: '$159',
      inStock: true
    }
  },
  {
    id: 'product-smartwatch-ultra',
    text: 'SmartWatch Ultra Pro: Premium fitness and lifestyle smartwatch with stunning 1.9-inch AMOLED always-on display (326 PPI) protected by sapphire crystal glass. Powered by our latest dual-core processor with 2GB RAM and 32GB storage for music and apps. Battery life: 7 days normal use, 14 days power saving mode, 30 hours continuous GPS tracking. Comprehensive health monitoring includes medical-grade heart rate sensor with ECG capability, blood oxygen (SpO2) monitoring 24/7, sleep tracking with REM analysis, stress monitoring, breathing exercises, and menstrual cycle tracking. Features 120+ sports modes including running, cycling, swimming (5ATM waterproof up to 50 meters), yoga, strength training, golf, skiing, and more. Built-in GPS, GLONASS, Galileo, and BeiDou for accurate outdoor tracking without phone. NFC for contactless payments, WiFi, Bluetooth 5.2. Receives notifications, calls, messages from your phone. Voice assistant built-in. Interchangeable bands in silicone, leather, and metal available separately. Military-grade durability (MIL-STD-810G certified). Works with iOS 12+ and Android 7+. Includes magnetic charging dock and quick start guide. Available in Space Black, Silver Titanium, and Gold. Case size: 45mm. 3-year warranty. Perfect for fitness enthusiasts, athletes, health-conscious individuals, and tech lovers.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Wearables',
      tags: ['smartwatch', 'fitness', 'health', 'gps', 'waterproof', 'wearable', 'sports'],
      productId: 'SW-ULTRA-2024',
      productName: 'SmartWatch Ultra Pro',
      price: '$449',
      inStock: true
    }
  },
  {
    id: 'product-laptop-zenbook',
    text: 'ZenBook Pro 15 Laptop: Ultra-portable powerhouse featuring Intel Core i7-13700H processor (14 cores, up to 5.0GHz) with 32GB DDR5 RAM and 1TB PCIe 4.0 NVMe SSD. Stunning 15.6-inch 4K OLED touchscreen display with 100% DCI-P3 color gamut, HDR support, and Pantone validation - perfect for creative professionals. NVIDIA GeForce RTX 4060 GPU with 8GB GDDR6 for gaming, 3D rendering, and AI workloads. Premium all-aluminum chassis weighing just 1.8kg, only 16.9mm thin. Full-size backlit keyboard with NumberPad 2.0 integrated into touchpad. Comprehensive connectivity: 2x Thunderbolt 4, 2x USB 3.2 Type-A, HDMI 2.1, SD card reader, 3.5mm audio jack. WiFi 6E and Bluetooth 5.3. Harman Kardon certified audio with Dolby Atmos. 1080p webcam with privacy shutter and Windows Hello facial recognition. 76Wh battery provides 10-12 hours mixed use, supports 100W USB-C fast charging (50% in 30 mins). Pre-installed Windows 11 Pro with lifetime license. Includes premium sleeve, USB-C hub adapter, and wireless mouse. 3-year international warranty with premium support. Available in Moonlight Silver and Deep Space Gray. Ideal for content creators, developers, designers, video editors, and business professionals.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Computing',
      tags: ['laptop', 'computer', 'ultrabook', 'creator', 'workstation', 'portable', 'oled'],
      productId: 'ZB-PRO-15',
      productName: 'ZenBook Pro 15 Laptop',
      price: '$1899',
      inStock: true
    }
  },
  {
    id: 'product-camera-mirrorless',
    text: 'Alpha 7R Mirrorless Camera: Professional full-frame mirrorless camera with groundbreaking 61MP back-illuminated Exmor R sensor delivering exceptional resolution and dynamic range. Advanced BIONZ XR processor enables 10fps continuous shooting with full AF/AE tracking. Hybrid autofocus system with 693 phase-detection points and 425 contrast-detection points covers 93% of frame with Real-time Eye AF for humans, animals, and birds. 5-axis in-body image stabilization provides 5.5 stops of shake correction. Records 4K video at 60fps with 10-bit 4:2:2 color, S-Log3 for professional color grading. 3.69M-dot OLED electronic viewfinder with 120fps refresh rate. Vari-angle 3.2-inch touchscreen LCD. Dual SD card slots (UHS-II). Weather-sealed magnesium alloy body built for professional use. Native ISO range 100-32000 (expandable to 50-102400). Compatible with extensive E-mount lens ecosystem. Features include focus bracketing, pixel shift multi-shooting, interval shooting, and time-lapse. Battery life: 530 shots per charge. USB-C port supports power delivery and fast transfer. WiFi, Bluetooth, and NFC connectivity for seamless smartphone integration. Includes battery, charger, strap, body cap, and accessory shoe cap. Available in Black. Perfect for landscape photographers, portrait artists, commercial photographers, and serious enthusiasts. 3-year professional warranty.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Photography',
      tags: ['camera', 'mirrorless', 'photography', 'professional', 'fullframe', '4k', 'video'],
      productId: 'A7R-V',
      productName: 'Alpha 7R Mirrorless Camera',
      price: '$3499',
      inStock: true
    }
  },
  {
    id: 'product-tablet-pro',
    text: 'ProTab 12 Tablet: Versatile 2-in-1 tablet with laptop-class performance featuring Snapdragon 8 Gen 2 processor, 12GB RAM, and 256GB storage (expandable via microSD up to 1TB). Gorgeous 12.4-inch Super AMOLED display with 120Hz refresh rate, 2800x1752 resolution, and HDR10+ support. Includes S Pen Pro stylus with 4096 pressure levels and 9ms latency for natural writing and drawing - perfect for note-taking, digital art, and document annotation. Quad speakers tuned by AKG with Dolby Atmos create immersive audio. 13MP rear camera and 8MP front camera for video calls and scanning documents. All-day battery (10,000mAh) lasts 14 hours of video playback, supports 45W super fast charging. Optional Book Cover Keyboard (sold separately) transforms into full laptop replacement with trackpad and function keys. Runs Android 13 with Samsung DeX mode for desktop-like productivity. Includes: Microsoft Office, Adobe Photoshop Express, Clip Studio Paint trial. 5G connectivity optional. WiFi 6E, Bluetooth 5.3, USB-C 3.2. Four microphones with noise cancellation. In-display fingerprint scanner. Available in Graphite Gray, Mystic Silver, and Rose Gold. Weight: 567g (tablet only). Perfect for students, artists, professionals, content consumers, and hybrid workers. 2-year warranty with Samsung Care+ option.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Tablets',
      tags: ['tablet', 'stylus', 'drawing', 'productivity', '2-in-1', 'android', 'creative'],
      productId: 'PT-12-PRO',
      productName: 'ProTab 12 Tablet',
      price: '$899',
      inStock: true
    }
  },
  {
    id: 'product-earbuds-pro',
    text: 'AirPods Elite Pro True Wireless Earbuds: Premium active noise cancelling earbuds with adaptive transparency mode that intelligently adjusts based on environment noise levels. Custom-designed 11mm drivers with dual-layer diaphragm deliver rich bass and crisp treble. Personalized spatial audio with dynamic head tracking creates theater-like experience for music and movies. Six-microphone array with AI-powered noise reduction ensures crystal-clear calls even in windy conditions. Battery life: 6 hours per charge (ANC on), 8 hours (ANC off), with charging case providing 30 total hours. Fast charge: 5 minutes gives 1 hour playback. IPX5 water resistance handles sweat and light rain. Three ear tip sizes (S/M/L) included for secure, comfortable fit with fit test in app. Touch controls for play/pause, skip, volume, ANC toggle, voice assistant. Seamless device switching between phone, tablet, laptop. Qi wireless charging case supports USB-C wired charging. Find My integration helps locate lost earbuds. Supports SBC, AAC, and LDAC codecs. Low latency gaming mode reduces lag to 60ms. Available in Pure White, Midnight Black, and Lunar Gray. Includes charging case, USB-C cable, ear tips, and premium storage pouch. Perfect for commuters, fitness enthusiasts, mobile professionals, and audiophiles on the go. 1-year warranty with AppleCare-style replacement program available.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Audio',
      tags: ['earbuds', 'wireless', 'noise cancelling', 'true wireless', 'anc', 'waterproof', 'sports'],
      productId: 'AE-PRO-2024',
      productName: 'AirPods Elite Pro',
      price: '$249',
      inStock: true
    }
  },
  {
    id: 'product-monitor-ultrawide',
    text: 'UltraView 34 Curved Gaming Monitor: Immersive 34-inch ultrawide curved (1800R) display with stunning 3440x1440 UWQHD resolution and 21:9 aspect ratio providing 33% more screen space than standard 16:9 monitors. Quantum Dot IPS panel delivers 98% DCI-P3 color coverage and HDR600 certification for vibrant, accurate colors. Blazing-fast 180Hz refresh rate with 1ms response time (GtG) and NVIDIA G-SYNC Ultimate + AMD FreeSync Premium Pro eliminates screen tearing and stuttering. Peak brightness 600 nits for HDR content. Ergonomic stand offers tilt, swivel, height adjustment, and pivot. Comprehensive connectivity: DisplayPort 1.4, HDMI 2.1 x2, USB-C with 90W power delivery (charge laptop while using as display), 4-port USB 3.2 hub. Built-in KVM switch to control multiple computers with one keyboard/mouse. Picture-by-Picture and Picture-in-Picture modes for multitasking. Ambient RGB lighting on back syncs with on-screen content. Blue light filter and flicker-free technology reduce eye strain during long sessions. VESA mount compatible (100x100mm). Includes DisplayPort and USB-C cables, cable management, and remote control. Weight: 8.2kg. Available in Matte Black. Ideal for gamers, streamers, video editors, stock traders, developers, and multitaskers. 3-year warranty with zero dead pixel guarantee.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Displays',
      tags: ['monitor', 'gaming', 'ultrawide', 'curved', 'hdr', 'high refresh rate', 'gsync'],
      productId: 'UV-34-180',
      productName: 'UltraView 34 Curved Gaming Monitor',
      price: '$799',
      inStock: true
    }
  },
  {
    id: 'product-keyboard-mechanical',
    text: 'MechMaster Pro Wireless Mechanical Keyboard: Premium 75% compact layout (84 keys) wireless mechanical keyboard with hot-swappable switch sockets supporting 3-pin and 5-pin switches. Ships with pre-lubed Gateron Pro Yellow linear switches (45g actuation force) providing smooth, quiet typing experience. Gasket-mounted design with silicone dampeners, foam layers, and PET switch pads for premium acoustics and typing feel. CNC aluminum frame in 6063 aluminum with anodized finish. Per-key RGB lighting with 16.8 million colors and 20+ preset effects, customizable via software. PBT double-shot keycaps with shine-through legends, Cherry profile. Tri-mode connectivity: Bluetooth 5.1 (connect 3 devices), 2.4GHz wireless via USB dongle (1000Hz polling), or wired USB-C. Battery: 4000mAh rechargeable lasting 200+ hours (no backlight). Features include: N-key rollover, 1000Hz polling rate wired, Windows and Mac layout modes, multimedia keys, programmable macros. Software allows complete key remapping, macro recording, lighting customization. South-facing LED design prevents keycap interference. Includes: coiled USB-C cable, 2.4GHz dongle, keycap puller, switch puller, extra switches and keycaps, carrying case. Available in Space Gray, Rose Gold, and Ghost White. Perfect for programmers, writers, gamers, and keyboard enthusiasts. 2-year warranty.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Peripherals',
      tags: ['keyboard', 'mechanical', 'wireless', 'gaming', 'typing', 'rgb', 'hotswap'],
      productId: 'MM-PRO-75',
      productName: 'MechMaster Pro Wireless Keyboard',
      price: '$169',
      inStock: true
    }
  },
  {
    id: 'product-backpack-tech',
    text: 'TechPack Pro 40L Travel Backpack: Ultimate carry-on travel backpack designed for digital nomads and business travelers. Main compartment expands from 30L to 40L with expansion zipper. Dedicated padded laptop compartment fits up to 17-inch laptops with separate tablet sleeve. Front organization panel with 15+ pockets for cables, chargers, passport, pens, and accessories. Quick-access top pocket for phone, wallet, keys. Hidden back pocket against your body for valuables. Water-resistant 900D ballistic nylon exterior with YKK water-resistant zippers throughout. Luggage pass-through strap slides over rolling suitcase handles. Convertible design works as backpack or briefcase with hideaway shoulder straps and side handle. Comfortable padded back panel with airflow channels and adjustable sternum strap with emergency whistle. Side compression straps cinch load and attach yoga mat or jacket. Bottle pockets on both sides fit 32oz bottles. Includes rain cover stored in bottom pocket. TSA-friendly design lays flat for security screening. Internal dimensions: 20 x 13 x 9 inches (40L expanded). Weight: 1.4kg empty. Available in Jet Black, Charcoal Gray, and Navy Blue. Materials are vegan and sustainably sourced. Lifetime warranty against defects. Perfect for remote workers, frequent travelers, students, and photographers.',
    metadata: {
      category: 'Products',
      source: 'Product Catalog - Bags & Accessories',
      tags: ['backpack', 'travel', 'laptop bag', 'carry-on', 'tech accessories', 'business'],
      productId: 'TP-40L-PRO',
      productName: 'TechPack Pro 40L Travel Backpack',
      price: '$129',
      inStock: true
    }
  }
];

module.exports = knowledgeBase;

