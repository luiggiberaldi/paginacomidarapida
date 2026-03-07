import React, { useState } from "react";
import { Plus, Minus, Clock, Info } from "lucide-react";

export default function ProductCard({ product, onAdd, cartItems = [], onUpdateQty }) {
  // For this simple version, we assume "Sencillo" size by default and no extras if not handled by a modal.
  // Ideally, when clicking '+', a modal opens. For now, we'll just add it directly or show a modal.
  const [imageLoaded, setImageLoaded] = useState(false);

  const cartItem = cartItems.find((item) => item.id === product.id);
  const quantityInCart = cartItem ? cartItem.qty : 0;

  const handleAddClick = () => {
    onAdd(product);
  };

  const handleIncrease = () => {
    onUpdateQty(product.id, quantityInCart + 1);
  };

  const handleDecrease = () => {
    onUpdateQty(product.id, quantityInCart - 1);
  };

  return (
    <div className="animate-reveal group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full relative">
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden w-full shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50">
            <span className="text-5xl opacity-50">🍔</span>
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/50">
          <p className="font-black text-slate-800 leading-none flex items-baseline gap-1">
            <span className="text-xs text-slate-500 font-bold">$</span>
            {parseFloat(product.price_usd).toFixed(2)}
          </p>
        </div>

        {/* Prep Time */}
        {product.prep_time && (
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1.5 shadow-sm">
            <Clock size={12} className="text-white drop-shadow-md" />
            <span className="text-[11px] font-bold text-white drop-shadow-md">
              {product.prep_time}m
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col bg-white">
        <div className="mb-2">
          <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
        </div>

        {product.description && (
          <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-1">
            {product.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto relative z-10 w-full pt-2">
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between w-full bg-slate-100 rounded-2xl p-1 shadow-inner border border-slate-200/50">
              <button
                onClick={handleDecrease}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-200 shrink-0"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 flex text-center justify-center items-center">
                <span className="font-black text-lg text-slate-800 w-8 tabular-nums">
                  {quantityInCart}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline-block">en orden</span>
              </div>
              <button
                onClick={handleIncrease}
                className="w-10 h-10 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-500/30 transition-all active:scale-95 shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddClick}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold py-3.5 rounded-2xl transition-colors border border-slate-200 hover:border-red-200 group/btn"
            >
              <Plus
                size={18}
                className="transform group-hover/btn:scale-110 transition-transform text-slate-400 group-hover/btn:text-red-500"
              />
              Añadir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
