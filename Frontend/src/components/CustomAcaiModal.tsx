import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, DollarSign } from 'lucide-react';
import { Complement, CustomAcai } from '../types';
import { apiService } from '../services/api';
import { useCart } from '../contexts/CartContext';
import Loading from './Loading';

interface CustomAcaiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomAcaiModal: React.FC<CustomAcaiModalProps> = ({ isOpen, onClose }) => {
  const [complements, setComplements] = useState<Complement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState<number>(15); // Valor padrão R$ 15
  const [selectedComplements, setSelectedComplements] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  
  const { addCustomAcai } = useCart();
  
  // Valores pré-definidos comuns
  const commonValues = [8, 10, 12, 15, 18, 20, 25, 30];
  
  useEffect(() => {
    if (isOpen) {
      loadComplements();
    }
  }, [isOpen]);
  
  const loadComplements = async () => {
    try {
      setLoading(true);
      const data = await apiService.getComplements();
      setComplements(data.filter((comp: Complement) => comp.isActive));
    } catch (error) {
     
    } finally {
      setLoading(false);
    }
  };
  
  const toggleComplement = (complementId: number) => {
    setSelectedComplements(prev => 
      prev.includes(complementId)
        ? prev.filter(id => id !== complementId)
        : [...prev, complementId]
    );
  };
  
  const handleAddToCart = async () => {
    if (selectedValue <= 0) {
      alert('Por favor, escolha um valor para o item');
      return;
    }
    
    try {
      setAddingToCart(true);
      
      const complementNames = complements
        .filter(comp => selectedComplements.includes(comp.id))
        .map(comp => comp.name);
      
      const customAcai: CustomAcai = {
        value: selectedValue,
        selectedComplements,
        complementNames
      };
      
      await addCustomAcai(customAcai, quantity);
      
      // Reset form
      setSelectedValue(15);
      setSelectedComplements([]);
      setQuantity(1);
      onClose();
      
    } catch (error) {
     
      alert('Erro ao adicionar ao carrinho. Tente novamente.');
    } finally {
      setAddingToCart(false);
    }
  };
  
  const totalPrice = selectedValue * quantity;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Monte seu item</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {loading ? (
          <div className="p-8">
            <Loading />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Escolha do valor */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                Escolha o valor do seu item
              </h3>
              
              {/* Valores pré-definidos */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {commonValues.map(value => (
                  <button
                    key={value}
                    onClick={() => setSelectedValue(value)}
                    className={`p-3 rounded-lg border-2 transition-all font-medium ${
                      selectedValue === value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 text-gray-700'
                    }`}
                  >
                    R$ {value}
                  </button>
                ))}
              </div>
              
              {/* Input personalizado */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Ou digite outro valor:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    R$
                  </span>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.50"
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(Number(e.target.value))}
                    className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="15.00"
                  />
                </div>
              </div>
            </div>
            
            {/* Seleção de complementos */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Escolha os complementos (inclusos no valor)
              </h3>
              
              {complements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum complemento disponível no momento
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {complements.map(complement => (
                    <button
                      key={complement.id}
                      onClick={() => toggleComplement(complement.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedComplements.includes(complement.id)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{complement.name}</span>
                        {selectedComplements.includes(complement.id) && (
                          <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Resumo da seleção */}
            {selectedComplements.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">
                  Complementos selecionados:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {complements
                    .filter(comp => selectedComplements.includes(comp.id))
                    .map(comp => (
                      <span
                        key={comp.id}
                        className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm"
                      >
                        {comp.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
            
            {/* Quantidade */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quantidade</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus size={18} />
                </button>
                <span className="text-xl font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer com preço e botão */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                {quantity}x Item Personalizado de R$ {selectedValue.toFixed(2)}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                Total: R$ {totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={addingToCart || selectedValue <= 0}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingToCart ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart size={20} />
                Adicionar ao Carrinho
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAcaiModal;