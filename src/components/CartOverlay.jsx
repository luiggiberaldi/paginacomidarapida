import React, { useState, useEffect } from "react";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  Car,
  Trash2,
  MapPin,
  Loader2
} from "lucide-react";
import { supabase } from "../utils/supabase";

export default function CartOverlay({ cartHooks, isOpen, onClose, tenantId, exchangeRate = 1 }) {
  const { cart, removeFromCart, updateQty, updateNote, clearCart, cartTotal, cartCount } =
    cartHooks;
  const [view, setView] = useState("cart"); // 'cart' | 'checkout' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({}); // { [cartId]: boolean }

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("LOCAL"); // 'LOCAL' | 'LLEVAR' | 'DELIVERY'
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Cargar datos guardados del cliente al abrir el modal (Fricción Cero)
  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem("pad_customer_name");
      const savedPhone = localStorage.getItem("pad_customer_phone");
      const savedAddress = localStorage.getItem("pad_customer_address");
      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
      if (savedAddress) setAddress(savedAddress);
    }
  }, [isOpen]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setView("checkout");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

        setAddress((prev) => {
          let cleanPrev = prev ? prev.replace(/Ubicación GPS: https:\/\/maps\.google\.com\/\?q=[^\s]+[\r\n]?/gi, "")
            .replace(/\(Precisión aprox: [0-9]+m\)/gi, "")
            .replace(/\(Por favor añade referencias del lugar\)/gi, "").trim() : "";

          let header = cleanPrev ? `${cleanPrev}\n\n` : "";
          const newAddress = `${header}Ubicación GPS: ${mapsLink}\n(Por favor añade referencias del lugar)`;
          return newAddress;
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "No se pudo obtener la ubicación.";
        if (error.code === 1) errorMsg = "Permiso de ubicación denegado.";
        else if (error.code === 2) errorMsg = "Ubicación no disponible.";
        else if (error.code === 3) errorMsg = "Tiempo de espera agotado al obtener ubicación.";
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      // Guardar datos para próxima compra
      localStorage.setItem("pad_customer_name", name.trim());
      localStorage.setItem("pad_customer_phone", phone.trim());
      if (deliveryType === 'DELIVERY') {
        localStorage.setItem("pad_customer_address", address.trim());
      }

      let formattedNotes = deliveryType === 'LLEVAR' ? '[PARA LLEVAR]' : deliveryType === 'DELIVERY' ? `[DELIVERY] Dir: ${address.trim()}` : '[EN EL LOCAL]';
      if (notes.trim()) formattedNotes += ` - Notas: ${notes.trim()}`;

      const orderPayload = {
        tenant_id: tenantId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_notes: formattedNotes,
        items: cart.map(item => ({
          ...item,
          id: item.local_id || item.id // Enviar el local_id a la cocina si existe
        })),
        total_usd: cartTotal,
        status: "pending",
      };

      const { error } = await supabase
        .from("web_orders")
        .insert([orderPayload]);
      if (error) throw error;

      clearCart();
      setView("success");

      // Optionally close after a few seconds
      setTimeout(() => {
        onClose();
        setTimeout(() => setView("cart"), 300); // reset after transition
      }, 5000);
    } catch (error) {
      console.error("Error enviando orden:", error);
      alert("Hubo un error al enviar tu orden. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-clip ${!isOpen ? 'pointer-events-none' : ''}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => { if (!isSubmitting) onClose(); }}
      />

      {/* Panel (Bottom Sheet on Mobile, Drawer on Desktop) */}
      <div
        className={`absolute sm:top-0 bottom-0 sm:right-0 w-full sm:w-[450px] sm:max-w-md bg-white sm:h-full max-h-[92vh] sm:max-h-full rounded-t-[32px] sm:rounded-none shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
          }`}
      >
        {/* Mobile Drag Handle */}
        <div className="w-full h-6 flex items-center justify-center sm:hidden shrink-0" onTouchStart={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            {view === "success"
              ? "¡Orden Enviada!"
              : view === "checkout"
                ? "Resumen y Envío"
                : "Tu Carrito"}
          </h2>
          <div className="flex items-center gap-1 -mr-2">
            {view === "cart" && cart.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas vaciar tu carrito?")) {
                    clearCart();
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 active:bg-red-50 rounded-full transition-colors flex items-center justify-center gap-1.5 px-3"
                title="Vaciar carrito"
              >
                <Trash2 size={16} />
                <span className="text-xs font-bold sm:hidden lg:inline-block">Vaciar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body Content based on View */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {view === "success" && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-4 border-4 border-green-50 dark:border-green-900/10">
                <ShoppingBag size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                ¡Gracias por tu pedido!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-[250px]">
                Hemos recibido tu orden en cocina. Te escribiremos muy pronto
                por WhatsApp para confirmar los detalles del pago.
              </p>
            </div>
          )}

          {view === "cart" && cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                Tu carrito está vacío
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Agrega algunas deliciosas opciones de nuestro menú
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl active:scale-95 transition-all"
              >
                Explorar Menú
              </button>
            </div>
          )}

          {view === "cart" && cart.length > 0 && (
            <div className="space-y-4">
              {/* Instructions Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50">
                <span className="text-lg leading-none mt-0.5">💡</span>
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  Toca <strong className="font-bold">✏️ Añadir instrucciones</strong> debajo de tu producto si necesitas personalizarlo (ej: sin cebolla, extra salsa, etc).
                </p>
              </div>
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[20px] border border-slate-100 dark:border-slate-800"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-[16px] object-cover shrink-0 shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-[16px] flex items-center justify-center text-slate-400 shrink-0">
                      🍔
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[15px] leading-tight line-clamp-2">
                          {item.name}{" "}
                          {item.size &&
                            `[${item.size}]`}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {item.selectedExtras?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          + {item.selectedExtras.map((e) => e.name).join(", ")}
                        </p>
                      )}

                      {/* ── Per-item Note ── */}
                      {expandedNotes[item.cartId] ? (
                        <div className="mt-2">
                          <textarea
                            autoFocus
                            value={item.note || ""}
                            onChange={(e) => updateNote(item.cartId, e.target.value)}
                            onBlur={() => setExpandedNotes(prev => ({ ...prev, [item.cartId]: false }))}
                            placeholder="Ej: sin cebolla, poca sal, extra salsa..."
                            rows={2}
                            className="w-full text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-400 resize-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [item.cartId]: true }))}
                          className="mt-1.5 flex items-center gap-1.5 group"
                        >
                          {item.note ? (
                            <span className="text-[11px] text-amber-600 flex gap-1 items-center">
                              <span className="bg-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0">Nota</span>
                              <span className="line-clamp-1">{item.note}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 group-hover:text-amber-500 transition-colors flex items-center gap-1">
                              <span>✏️</span> Añadir instrucciones
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="font-black text-red-600 dark:text-red-400 leading-none mb-0.5">
                          ${parseFloat(item.priceUsd).toFixed(2)}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400">
                          Bs {(parseFloat(item.priceUsd) * exchangeRate).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateQty(item.cartId, -1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-4 text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.cartId, 1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "checkout" && (
            <form
              id="checkout-form"
              onSubmit={handleSubmitOrder}
              className="space-y-6"
            >
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <h3 className="font-bold text-emerald-800 mb-1">
                  Casi listo
                </h3>
                <p className="text-sm text-emerald-700/80 leading-relaxed">
                  Confirma tus datos para enviarte el total en Bolívares por WhatsApp.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. María Sánchez"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Teléfono (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 123 4567"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Método de Entrega
                  </label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("LOCAL")}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "LOCAL" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      Mesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("LLEVAR")}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "LLEVAR" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      Llevar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("DELIVERY")}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "DELIVERY" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      Delivery
                    </button>
                  </div>
                </div>

                {deliveryType === "DELIVERY" && (
                  <div className="animate-reveal space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Dirección de Entrega
                    </label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Urb. El Pinar, Calle 4, Casa #12..."
                      rows="2"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Obteniendo GPS...
                        </>
                      ) : (
                        <>
                          <MapPin size={16} />
                          Usar mi ubicación actual
                        </>
                      )}
                    </button>
                    <p className="text-[11px] font-bold text-slate-500 text-center !mt-1">
                      Para mayor precisión en la entrega, te recomendamos fijar el GPS desde un teléfono móvil. 📱
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {deliveryType === "DELIVERY"
                      ? "Indicaciones para el Delivery (Opcional)"
                      : "Notas Generales del Pedido"}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      deliveryType === "DELIVERY"
                        ? "Ej: Timbre dañado, casa rejas negras, billete de 20$..."
                        : "Ej: Traer la comida rápido, necesito envoltorio, etc."
                    }
                    rows="2"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none shadow-sm"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer / Actions */}
        {view !== "success" && cart.length > 0 && (
          <div className="p-6 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 pb-8 sm:pb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-bold">Total a pagar</span>
              <div className="text-right">
                <span className="block text-3xl font-black text-slate-800 leading-none mb-1">
                  ${cartTotal.toFixed(2)}
                </span>
                <span className="block text-sm font-bold text-slate-400">
                  Bs {(cartTotal * exchangeRate).toFixed(2)}
                </span>
              </div>
            </div>

            {view === "cart" ? (
              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
              >
                Continuar al Pago
                <ArrowRight size={20} />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting || !name || !phone || (deliveryType === 'DELIVERY' && !address)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>Confirmar Pedido</>
                  )}
                </button>
                <button
                  onClick={() => setView("cart")}
                  className="w-full py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors bg-slate-50 rounded-xl"
                >
                  Modificar Carrito
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
