import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus, Power, PowerOff, CalendarDays, Package, Search, LayoutGrid, List, Tag } from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import ModalAdicionarProduto from './components/ModalAdicionarProduto';
import ModalEditarProduto from './components/ModalEditarProduto';
import ModalGerenciarCategorias from './components/ModalGerenciarCategorias';

const diasMap: Record<string, string> = {
  'D': 'Dom', 'S': 'Seg', 'T': 'Ter', 'Q': 'Qua', 'Q2': 'Qui', 'S2': 'Sex', 'S3': 'Sáb',
  '0': 'Dom', '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb',
};

const formatActiveDays = (activeDays?: string | null): string => {
  if (!activeDays || activeDays.trim() === '') return 'Todos os dias';
  const dias = activeDays.split(',').map(d => diasMap[d.trim()] || d.trim()).filter(Boolean);
  if (dias.length === 7) return 'Todos os dias';
  return dias.join(', ');
};

const Produtos: React.FC<{
  products: Product[],
  categories: ProductCategory[],
  showAddModal: boolean,
  setShowAddModal: (show: boolean) => void,
  showAddCategoryModal: boolean,
  setShowAddCategoryModal: (show: boolean) => void,
  editProduct: Product | null,
  setEditProduct: (product: Product | null) => void,
  handleAddProduct: (data: any) => void,
  handleEdit: (product: Product) => void,
  handleUpdateProduct: (id: number, data: any) => void,
  handleDelete: (id: number) => void,
  onCategoriesChange: () => void
}> = ({
  products, categories, showAddModal, setShowAddModal, showAddCategoryModal, setShowAddCategoryModal,
  editProduct, setEditProduct, handleAddProduct, handleEdit, handleUpdateProduct, handleDelete, onCategoriesChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || p.categoryId === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const activeCount = products.filter(p => p.isActive).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div id="produtos" className="page">
      <header className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Produtos</h2>
            <p className="text-xs sm:text-sm text-slate-500">Cadastre e gerencie seus produtos, categorias e variações.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <Package className="w-3.5 h-3.5" /> {products.length} total
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg text-xs font-medium text-green-700">
              <Power className="w-3.5 h-3.5" /> {activeCount} ativos
            </span>
            {inactiveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg text-xs font-medium text-red-600">
                <PowerOff className="w-3.5 h-3.5" /> {inactiveCount} inativos
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white px-3.5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
          <button
            className="border-2 border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:border-[#ea1d2c] hover:text-[#ea1d2c] hover:bg-red-50 transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            onClick={() => setShowAddCategoryModal(true)}
          >
            <Tag className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-colors"
          />
        </div>
        <select
          value={filterCategory === 'all' ? 'all' : filterCategory}
          onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] bg-white"
        >
          <option value="all">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#ea1d2c]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#ea1d2c]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || filterCategory !== 'all' ? 'Tente alterar os filtros de busca.' : 'Comece adicionando seu primeiro produto.'}
          </p>
        </div>
      ) : (
        <>
          {/* Grid View (Desktop) */}
          {viewMode === 'grid' && (
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden group transition-all hover:shadow-md ${
                    !prod.isActive ? 'border-red-100 opacity-75' : 'border-slate-100'
                  }`}
                >
                  {/* Imagem */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    {Array.isArray(prod.images) && prod.images.length > 0 && prod.images[0].url ? (
                      <img
                        src={prod.images[0].url}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-300" />
                      </div>
                    )}
                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                        <button
                          className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:bg-white hover:text-[#ea1d2c] transition-colors shadow-sm"
                          onClick={() => handleEdit(prod)}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className={`p-1.5 bg-white/90 backdrop-blur-sm rounded-lg transition-colors shadow-sm ${
                            prod.isActive ? 'text-green-600 hover:text-red-600' : 'text-red-600 hover:text-green-600'
                          }`}
                          onClick={() => {
                            const formData = new FormData();
                            formData.append('ativo', (!prod.isActive).toString());
                            handleUpdateProduct(prod.id, formData);
                          }}
                          title={prod.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {prod.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:bg-white hover:text-red-600 transition-colors shadow-sm"
                          onClick={() => handleDelete(prod.id)}
                          title="Deletar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Badges na imagem */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm ${
                        prod.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {prod.isActive ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                    {prod.category?.name && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm">
                        {prod.category.name}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1">{prod.name}</h3>
                      <span className="text-sm font-bold text-[#ea1d2c] whitespace-nowrap">
                        R$ {prod.price ? Number(prod.price).toFixed(2) : '--'}
                      </span>
                    </div>
                    {prod.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{prod.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-slate-400">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      <span className="text-[11px] truncate">{formatActiveDays(prod.activeDays)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View (Desktop) */}
          {viewMode === 'list' && (
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${
                      !prod.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Imagem */}
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {Array.isArray(prod.images) && prod.images.length > 0 && prod.images[0].url ? (
                        <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-slate-800 text-sm truncate">{prod.name}</h3>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          prod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {prod.isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      {prod.description && (
                        <p className="text-xs text-slate-400 truncate">{prod.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {prod.category?.name && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Tag className="w-3 h-3" /> {prod.category.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <CalendarDays className="w-3 h-3" /> {formatActiveDays(prod.activeDays)}
                        </span>
                      </div>
                    </div>

                    {/* Preço */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-base font-bold text-[#ea1d2c]">
                        R$ {prod.price ? Number(prod.price).toFixed(2) : '--'}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        className={`p-2 rounded-lg transition-colors ${
                          prod.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                        onClick={() => {
                          const formData = new FormData();
                          formData.append('ativo', (!prod.isActive).toString());
                          handleUpdateProduct(prod.id, formData);
                        }}
                        title={prod.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {prod.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                      <button
                        className="p-2 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-[#ea1d2c] transition-colors"
                        onClick={() => handleEdit(prod)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(prod.id)}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  !prod.isActive ? 'border-red-100 opacity-75' : 'border-slate-100'
                }`}
              >
                <div className="flex gap-3 p-3">
                  {/* Imagem */}
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {Array.isArray(prod.images) && prod.images.length > 0 && prod.images[0].url ? (
                      <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-7 h-7 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1">{prod.name}</h3>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        prod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {prod.isActive ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                    {prod.description && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{prod.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {prod.category?.name && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                          {prod.category.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                        <CalendarDays className="w-2.5 h-2.5" /> {formatActiveDays(prod.activeDays)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#ea1d2c] mt-1.5 block">
                      R$ {prod.price ? Number(prod.price).toFixed(2) : '--'}
                    </span>
                  </div>
                </div>

                {/* Ações Mobile */}
                <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
                  <button
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      prod.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                    }`}
                    onClick={() => {
                      const formData = new FormData();
                      formData.append('ativo', (!prod.isActive).toString());
                      handleUpdateProduct(prod.id, formData);
                    }}
                  >
                    {prod.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                    {prod.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#ea1d2c] hover:bg-red-50 transition-colors"
                    onClick={() => handleEdit(prod)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => handleDelete(prod.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <ModalAdicionarProduto
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProduct}
          onManageCategories={() => setShowAddCategoryModal(true)}
        />
      )}
      {editProduct && (
        <ModalEditarProduto
          categories={categories}
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onUpdate={handleUpdateProduct}
          onManageCategories={() => setShowAddCategoryModal(true)}
        />
      )}
      {showAddCategoryModal && (
        <ModalGerenciarCategorias
          categories={categories}
          onClose={() => setShowAddCategoryModal(false)}
          onCategoriesChange={onCategoriesChange}
        />
      )}
    </div>
  );
};

export default Produtos;