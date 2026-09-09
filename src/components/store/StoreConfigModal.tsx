import React, { useState } from "react";
import { X, Store, Save, MapPin, Phone, User, Tag, Navigation } from "lucide-react";
import { StoreMetadata } from "../../types.js";

interface StoreConfigModalProps {
  currentStore: StoreMetadata;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStore: StoreMetadata) => void;
}

export const StoreConfigModal: React.FC<StoreConfigModalProps> = ({
  currentStore,
  isOpen,
  onClose,
  onSave,
}) => {
  const [storeData, setStoreData] = useState<StoreMetadata>(currentStore);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAutoGPS = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setStoreData((prev) => ({
          ...prev,
          coordinates: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        }));
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(storeData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuración del Comercio</h3>
              <p className="text-xs text-slate-400">Datos que se transmitirán con cada alerta de pánico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nombre Comercial:</label>
            <input
              type="text"
              value={storeData.storeName}
              onChange={(e) => setStoreData({ ...storeData, storeName: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">ID de Terminal:</label>
              <input
                type="text"
                value={storeData.storeId}
                onChange={(e) => setStoreData({ ...storeData, storeId: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Giro / Categoría:</label>
              <input
                type="text"
                value={storeData.category}
                onChange={(e) => setStoreData({ ...storeData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Propietario / Responsable:</label>
              <input
                type="text"
                value={storeData.ownerName}
                onChange={(e) => setStoreData({ ...storeData, ownerName: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Teléfono de Emergencia:</label>
              <input
                type="text"
                value={storeData.phone}
                onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Dirección Física:</label>
            <input
              type="text"
              value={storeData.address}
              onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">Coordenadas GPS de la Tienda:</label>
              <button
                type="button"
                onClick={handleAutoGPS}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                {isLocating ? "Detectando..." : "Calibrar con GPS Actual"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={storeData.coordinates.latitude}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    coordinates: { ...storeData.coordinates, latitude: parseFloat(e.target.value) || 0 },
                  })
                }
                placeholder="Latitud"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                step="any"
                value={storeData.coordinates.longitude}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    coordinates: { ...storeData.coordinates, longitude: parseFloat(e.target.value) || 0 },
                  })
                }
                placeholder="Longitud"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
