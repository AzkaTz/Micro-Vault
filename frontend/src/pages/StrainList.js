import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { strainsAPI } from '../services/api';
import StrainDetailModal from '../components/StrainDetailModal';
import StrainFormModal from '../components/StrainFormModal';

function StrainList() {
  const { user } = useAuth();
  const [strains, setStrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    microorganism_type: '',
    sample_type: '',
    search: '',
    cellulolytic: false,
    antimicrobial: false,
    nitrogen_fixer: false,
  });

  // Modals
  const [selectedStrain, setSelectedStrain] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [strainToEdit, setStrainToEdit] = useState(null);

  // Fetch strains
  const fetchStrains = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        // Convert boolean to string for API
        cellulolytic: filters.cellulolytic ? 'true' : undefined,
        antimicrobial: filters.antimicrobial ? 'true' : undefined,
        nitrogen_fixer: filters.nitrogen_fixer ? 'true' : undefined,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined) {
          delete params[key];
        }
      });

      const data = await strainsAPI.getAll(params);
      setStrains(data.strains);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Fetch strains error:', err);
      setError('Failed to load strains');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStrains();
  }, [pagination.page, filters]);

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchStrains();
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle view details
  const handleViewDetails = (strain) => {
    setSelectedStrain(strain);
    setShowDetailModal(true);
  };

  // Handle add new
  const handleAddNew = () => {
    setStrainToEdit(null);
    setShowFormModal(true);
  };

  // Handle edit
 const handleEdit = (strain) => {
    console.log('=== HANDLE EDIT ===');
    console.log('Full strain object:', strain);
    console.log('Strain ID:', strain.id);
    console.log('Strain ID type:', typeof strain.id);
    console.log('Strain ID length:', strain.id?.length);
    console.log('==================');
    
    setStrainToEdit(strain);
    setShowFormModal(true);
 };

// Handle save (create or update)
    const handleSave = async (formData) => {
    try {
        if (strainToEdit) {
        let cleanId = strainToEdit.id;

        // =================================================
        // INI INTI SOLUSINYA
        // BUANG `id` DARI BODY SEBELUM DIKIRIM
        // =================================================
        const { id, ...payloadWithoutId } = formData;

        await strainsAPI.update(cleanId, payloadWithoutId);
        } else {
        // CREATE TIDAK MASALAH, KARENA TIDAK ADA ID
        await strainsAPI.create(formData);
        }

        fetchStrains();
    } catch (err) {
        console.error('Save error:', err);
        throw err;
    }
    };



  // Handle delete
  const handleDelete = async (strain) => {
    if (window.confirm(`Are you sure you want to delete strain ${strain.strain_code}?`)) {
      try {
        await strainsAPI.delete(strain.id);
        fetchStrains(); // Refresh list
      } catch (err) {
        alert('Failed to delete strain');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="px-4 py-4 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Strain Collection</h1>
            <p className="text-sm text-gray-600 mt-1">
              Biosafety Clearance: Level {user?.biosafety_clearance}
            </p>
          </div>
          <button 
            onClick={handleAddNew}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-medium">
                + Add New Strain
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Microorganism Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microorganism Type
              </label>
              <select
                name="microorganism_type"
                value={filters.microorganism_type}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Types</option>
                <option value="BAKTERI">Bakteri</option>
                <option value="YEAST">Yeast</option>
                <option value="KAPANG">Kapang</option>
                <option value="ACTINOMYCETES">Actinomycetes</option>
              </select>
            </div>

            {/* Sample Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Type
              </label>
              <select
                name="sample_type"
                value={filters.sample_type}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Samples</option>
                <option value="Tanah">Tanah</option>
                <option value="Air">Air</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search strain code, genus, or location..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </form>
            </div>
          </div>

          {/* Potential Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Potentials
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="cellulolytic"
                  checked={filters.cellulolytic}
                  onChange={handleFilterChange}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Cellulolytic</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="antimicrobial"
                  checked={filters.antimicrobial}
                  onChange={handleFilterChange}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Antimicrobial</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="nitrogen_fixer"
                  checked={filters.nitrogen_fixer}
                  onChange={handleFilterChange}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Nitrogen Fixer</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading strains...</div>
          </div>
        )}

        {/* Strains Grid (Card View) */}
        {!loading && strains.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {strains.map((strain) => (
                <div key={strain.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary to-blue-600 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg">{strain.strain_code}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        strain.biosafety_level === 1 ? 'bg-green-100 text-green-800' :
                        strain.biosafety_level === 2 ? 'bg-yellow-100 text-yellow-800' :
                        strain.biosafety_level === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        BSL-{strain.biosafety_level}
                      </span>
                    </div>
                    <p className="text-white text-sm mt-1 opacity-90">
                      {strain.genus_species || 'Unidentified'}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Type & Sample */}
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {strain.microorganism_type}
                      </span>
                      {strain.sample_type && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {strain.sample_type}
                        </span>
                      )}
                    </div>

                    {/* Origin Location */}
                    {strain.origin_location && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Origin</p>
                        <p className="text-sm text-gray-900">{strain.origin_location}</p>
                      </div>
                    )}

                    {/* Characteristics */}
                    {(strain.characteristics_macroscopic || strain.characteristics_microscopic) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Characteristics</p>
                        
                        {strain.characteristics_macroscopic && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700">Macroscopic:</p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {strain.characteristics_macroscopic}
                            </p>
                          </div>
                        )}
                        
                        {strain.characteristics_microscopic && (
                          <div>
                            <p className="text-xs font-medium text-gray-700">Microscopic:</p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {strain.characteristics_microscopic}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Potentials */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Potentials</p>
                      <div className="flex flex-wrap gap-1">
                        {strain.potential_nitrogen_fixer && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">N-Fixer</span>
                        )}
                        {strain.potential_phosphate_solubilizer && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">P-Solubilizer</span>
                        )}
                        {strain.potential_proteolytic && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Proteolytic</span>
                        )}
                        {strain.potential_lipolytic && (
                          <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-800 rounded">Lipolytic</span>
                        )}
                        {strain.potential_amylolytic && (
                          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">Amylolytic</span>
                        )}
                        {strain.potential_cellulolytic && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Cellulolytic</span>
                        )}
                        {strain.potential_antimicrobial && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">Antimicrobial</span>
                        )}
                        {strain.potential_iaa_hormone && (
                          <span className="px-2 py-0.5 text-xs bg-teal-100 text-teal-800 rounded">IAA Hormone</span>
                        )}
                        {!strain.potential_nitrogen_fixer && 
                         !strain.potential_phosphate_solubilizer && 
                         !strain.potential_proteolytic &&
                         !strain.potential_lipolytic &&
                         !strain.potential_amylolytic &&
                         !strain.potential_cellulolytic &&
                         !strain.potential_antimicrobial &&
                         !strain.potential_iaa_hormone && (
                          <span className="text-xs text-gray-400">No potentials recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Storage Info */}
                    {(strain.storage_technique || strain.storage_location || strain.culture_stock) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Storage</p>
                        {strain.storage_technique && (
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Technique:</span> {strain.storage_technique}
                          </p>
                        )}
                        {strain.storage_location && (
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Location:</span> {strain.storage_location}
                          </p>
                        )}
                        {strain.culture_stock && (
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Stock:</span> {strain.culture_stock}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                    <button 
                      onClick={() => handleViewDetails(strain)}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      View Details
                    </button>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(strain)}
                        className="text-gray-600 hover:text-gray-900 text-sm"
                      >
                        Edit
                      </button>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={() => handleDelete(strain)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-lg shadow sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && strains.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No strains found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or create a new strain.</p>
          </div>
        )}
        {/* ===== TAMBAHKAN MODALS DI SINI ===== */}
        {showDetailModal && (
            <StrainDetailModal
                strain={selectedStrain}
                onClose={() => setShowDetailModal(false)}
            />
        )}

        {showFormModal && (
            <StrainFormModal
                strain={strainToEdit}
                onClose={() => setShowFormModal(false)}
                onSave={handleSave}
            />
        )}
      </div>
    </div>
  );
}

export default StrainList;