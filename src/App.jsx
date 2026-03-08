import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import { ShoppingCart, Flame, UtensilsCrossed, Store, Search, ChevronLeft } from "lucide-react";
import { useCatalog } from "./hooks/useCatalog";
import { useCart } from "./hooks/useCart";
import ProductCard from "./components/ProductCard";
import CartOverlay from "./components/CartOverlay";
import BurgerHero from "./components/BurgerHero";

function StorePage() {
  const { slug } = useParams();
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const categoryRefs = useRef({});

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const { catalog, config, loading, notFound } = useCatalog(slug);
  const cartHooks = useCart();
  const { cartCount, isCartOpen, setIsCartOpen } = cartHooks;

  // 404 — Negocio no encontrado
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Store size={48} className="text-slate-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-700 mb-2">Negocio no encontrado</h1>
        <p className="text-slate-500 max-w-xs">
          El enlace que usaste no corresponde a ningún negocio registrado. Verifica el link o contacta al vendedor.
        </p>
      </div>
    );
  }

  const filteredCatalog = catalog.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group products by category
  const categoriesMap = filteredCatalog.reduce((acc, curr) => {
    const cat = curr.category || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  // Default PWA category ordering
  const PWA_CATEGORY_ORDER = [
    "perros",
    "hamburguesas",
    "pepitos",
    "arepas",
    "raciones",
    "combos",
    "bebidas",
    "postres",
    "extras"
  ];

  const CATEGORY_LABELS = {
    "hamburguesas": "Hamburguesas",
    "perros": "Perros Calientes",
    "combos": "Combos",
    "bebidas": "Bebidas",
    "extras": "Extras",
    "postres": "Postres",
    "raciones": "Raciones",
    "pepitos": "Pepitos",
    "arepas": "Arepas"
  };

  const categoryOrder = Object.keys(categoriesMap).sort((a, b) => {
    const idxA = PWA_CATEGORY_ORDER.indexOf(a.toLowerCase());
    const idxB = PWA_CATEGORY_ORDER.indexOf(b.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Scroll Spy via Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Encontrar la entrada más visible
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Si hay varias, tomar la primera
          setActiveCategory(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categoryOrder.length]); // Re-run when categories change

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 130; // Altura del sticky header + tab bar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      {/* ─── HEADER PREMIUM ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-[0_4px_30px_rgb(0,0,0,0.03)] border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col">
            {/* Top Bar: Logo & Cart */}
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                  <img
                    src="/logo_principal.png"
                    alt={config.business_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg font-black text-slate-800 leading-tight capitalize">
                    {config.business_name || "Cargando..."}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-500 uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Abierto
                  </span>
                </div>
              </div>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 sm:p-3 text-slate-700 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full active:scale-95 transition-all border border-slate-100"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black text-white bg-red-500 rounded-full shadow-md border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Sticky Categories Bar */}
            {!loading && !notFound && categoryOrder.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {categoryOrder.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(`category-${cat}`)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 capitalize ${activeCategory === `category-${cat}`
                      ? "bg-slate-900 text-white shadow-md transform scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition-shadow placeholder-slate-400"
            placeholder="¿Qué se te antoja hoy?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full min-h-[400px]">
          {/* Menu Catalog */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-red-500 animate-spin mb-4" />
              <p className="font-bold">Cargando menú delicioso...</p>
            </div>
          ) : catalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <UtensilsCrossed size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Menú no disponible</h3>
              <p className="text-slate-500 max-w-xs">
                Este negocio aún no ha publicado sus productos.
              </p>
            </div>
          ) : (
            <div className="space-y-10 sm:space-y-14">
              {categoryOrder.length === 0 && searchQuery && (
                <div className="text-center py-10">
                  <p className="text-slate-500 font-medium">No se encontraron productos para "{searchQuery}"</p>
                </div>
              )}
              {categoryOrder.map((category) => (
                <section
                  key={category}
                  id={`category-${category}`}
                  ref={(el) => (categoryRefs.current[`category-${category}`] = el)}
                  className="scroll-mt-36" // Offset para el sticky header
                >
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-6 flex items-center capitalize">
                    {CATEGORY_LABELS[category.toLowerCase()] || category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {categoriesMap[category].map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={(p) => cartHooks.addToCart(p)}
                        cartItems={cartHooks.cart}
                        onUpdateQty={cartHooks.updateQty}
                        onRemove={cartHooks.removeFromCart}
                        exchangeRate={config.exchange_rate || 1}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <CartOverlay
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartHooks={cartHooks}
        tenantId={config.tenant_id}
        exchangeRate={config.exchange_rate || 1}
      />

      {/* Floating Action Button for Mobile Cart */}
      {cartCount > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-6 z-50 p-4 bg-red-600 text-white rounded-full shadow-2xl shadow-red-500/50 flex items-center gap-2 animate-bounce hover:animate-none group active:scale-90 transition-all sm:hidden"
        >
          <ShoppingCart size={24} />
          <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-black">
            {cartCount}
          </span>
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/:slug" element={<StorePage />} />
        <Route path="/" element={
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <Store size={48} className="text-red-300" />
            </div>
            <h1 className="text-2xl font-black text-slate-700 mb-2">Precios Al Día</h1>
            <p className="text-slate-500 max-w-xs">
              Para ver el menú de un negocio, necesitas un enlace directo del vendedor.
            </p>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
