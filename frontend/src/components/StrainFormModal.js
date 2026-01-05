import React, { useState, useEffect } from 'react';

function StrainFormModal({ strain, onClose, onSave }) {
  const [formData, setFormData] = useState({
    strain_code: '',
    microorganism_type: 'BAKTERI',
    genus_species: '',
    genus: '',
    species: '',
    sample_type: '',
    origin_location: '',
    isolation_date: '',
    characteristics_macroscopic: '',
    characteristics_microscopic: '',
    characteristics_biochemical: '',
    potential_nitrogen_fixer: false,
    potential_phosphate_solubilizer: false,
    potential_proteolytic: false,
    potential_lipolytic: false,
    potential_amylolytic: false,
    potential_cellulolytic: false,
    potential_antimicrobial: false,
    potential_iaa_hormone: false,
    storage_technique: '',
    culture_stock: '',
    storage_location: '',
    biosafety_level: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (strain) {
      // Handle null values from database
      setFormData({
        ...strain,
        genus_species: strain.genus_species || '',
        genus: strain.genus || '',
        species: strain.species || '',
        sample_type: strain.sample_type || '',
        origin_location: strain.origin_location || '',
        isolation_date: strain.isolation_date || '',
        characteristics_macroscopic: strain.characteristics_macroscopic || '',
        characteristics_microscopic: strain.characteristics_microscopic || '',
        characteristics_biochemical: strain.characteristics_biochemical || '',
        storage_technique: strain.storage_technique || '',
        culture_stock: strain.culture_stock || '',
        storage_location: strain.storage_location || '',
      });
    }
  }, [strain]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for numeric fields
    if (name === 'biosafety_level') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.strain_code || !formData.microorganism_type) {
      setError('Strain code and microorganism type are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Clean up data
      const cleanedData = {
        ...formData,
        // Ensure biosafety_level is integer
        biosafety_level: parseInt(formData.biosafety_level),
        // Convert empty strings to null
        genus_species: formData.genus_species?.trim() || null,
        genus: formData.genus?.trim() || null,
        species: formData.species?.trim() || null,
        sample_type: formData.sample_type?.trim() || null,
        origin_location: formData.origin_location?.trim() || null,
        isolation_date: formData.isolation_date || null,
        characteristics_macroscopic: formData.characteristics_macroscopic?.trim() || null,
        characteristics_microscopic: formData.characteristics_microscopic?.trim() || null,
        characteristics_biochemical: formData.characteristics_biochemical?.trim() || null,
        storage_technique: formData.storage_technique?.trim() || null,
        culture_stock: formData.culture_stock?.trim() || null,
        storage_location: formData.storage_location?.trim() || null,
      };

      console.log('Submitting data:', cleanedData); // DEBUG

      await onSave(cleanedData);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      console.error('Error response:', err.response?.data); // DEBUG
      
      // Better error messages
      if (err.response?.data?.errors) {
        // Express-validator errors array
        const errorMessages = err.response.data.errors
          .map(e => `${e.param}: ${e.msg}`)
          .join(', ');
        setError(errorMessages);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to save strain. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <h3 className="text-2xl font-bold text-gray-900">
            {strain ? 'Edit Strain' : 'Add New Strain'}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strain Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="strain_code"
                  value={formData.strain_code}
                  onChange={handleChange}
                  required
                  disabled={!!strain}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Microorganism Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="microorganism_type"
                  value={formData.microorganism_type}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="BAKTERI">Bakteri</option>
                  <option value="YEAST">Yeast</option>
                  <option value="KAPANG">Kapang</option>
                  <option value="ACTINOMYCETES">Actinomycetes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genus/Species</label>
                <input
                  type="text"
                  name="genus_species"
                  value={formData.genus_species}
                  onChange={handleChange}
                  placeholder="e.g., Bacillus subtilis"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type</label>
                <input
                  type="text"
                  name="sample_type"
                  value={formData.sample_type}
                  onChange={handleChange}
                  placeholder="e.g., Tanah, Air"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin Location</label>
                <input
                  type="text"
                  name="origin_location"
                  value={formData.origin_location}
                  onChange={handleChange}
                  placeholder="e.g., Mangrove Jenu Tuban"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Characteristics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Characteristics - Macroscopic</label>
              <textarea
                name="characteristics_macroscopic"
                value={formData.characteristics_macroscopic}
                onChange={handleChange}
                rows="2"
                placeholder="Warna Koloni, Bentuk, Tepian, Elevasi..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Characteristics - Microscopic</label>
              <textarea
                name="characteristics_microscopic"
                value={formData.characteristics_microscopic}
                onChange={handleChange}
                rows="2"
                placeholder="Bentuk sel, Gram staining..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Characteristics - Biochemical</label>
              <textarea
                name="characteristics_biochemical"
                value={formData.characteristics_biochemical}
                onChange={handleChange}
                rows="2"
                placeholder="Test results..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Potentials */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Potentials</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_nitrogen_fixer"
                    checked={formData.potential_nitrogen_fixer}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Nitrogen Fixer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_phosphate_solubilizer"
                    checked={formData.potential_phosphate_solubilizer}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Phosphate Solubilizer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_proteolytic"
                    checked={formData.potential_proteolytic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Proteolytic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_lipolytic"
                    checked={formData.potential_lipolytic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Lipolytic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_amylolytic"
                    checked={formData.potential_amylolytic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Amylolytic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_cellulolytic"
                    checked={formData.potential_cellulolytic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Cellulolytic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_antimicrobial"
                    checked={formData.potential_antimicrobial}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">Antimicrobial</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="potential_iaa_hormone"
                    checked={formData.potential_iaa_hormone}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm">IAA Hormone</span>
                </label>
              </div>
            </div>

            {/* Storage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Technique</label>
                <input
                  type="text"
                  name="storage_technique"
                  value={formData.storage_technique}
                  onChange={handleChange}
                  placeholder="e.g., Slant Agar (NA)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  name="storage_location"
                  value={formData.storage_location}
                  onChange={handleChange}
                  placeholder="e.g., Freezer-A-1-1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Culture Stock</label>
                <input
                  type="text"
                  name="culture_stock"
                  value={formData.culture_stock}
                  onChange={handleChange}
                  placeholder="e.g., Available"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biosafety Level
                </label>
                <select
                  name="biosafety_level"
                  value={formData.biosafety_level}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={1}>BSL-1</option>
                  <option value={2}>BSL-2</option>
                  <option value={3}>BSL-3</option>
                  <option value={4}>BSL-4</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer - Inside Form */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Strain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StrainFormModal;