import React from 'react';

function StrainDetailModal({ strain, onClose }) {
  if (!strain) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <h3 className="text-2xl font-bold text-gray-900">{strain.strain_code}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Microorganism Type</p>
              <p className="mt-1 text-sm text-gray-900">{strain.microorganism_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Biosafety Level</p>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  strain.biosafety_level === 1 ? 'bg-green-100 text-green-800' :
                  strain.biosafety_level === 2 ? 'bg-yellow-100 text-yellow-800' :
                  strain.biosafety_level === 3 ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  BSL-{strain.biosafety_level}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Genus/Species</p>
              <p className="mt-1 text-sm text-gray-900">{strain.genus_species || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sample Type</p>
              <p className="mt-1 text-sm text-gray-900">{strain.sample_type || '-'}</p>
            </div>
          </div>

          {/* Origin */}
          {strain.origin_location && (
            <div>
              <p className="text-sm font-medium text-gray-500">Origin Location</p>
              <p className="mt-1 text-sm text-gray-900">{strain.origin_location}</p>
            </div>
          )}

          {/* Characteristics */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Characteristics</p>
            
            {strain.characteristics_macroscopic && (
              <div className="mb-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Macroscopic</p>
                <p className="text-sm text-gray-900">{strain.characteristics_macroscopic}</p>
              </div>
            )}
            
            {strain.characteristics_microscopic && (
              <div className="mb-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Microscopic</p>
                <p className="text-sm text-gray-900">{strain.characteristics_microscopic}</p>
              </div>
            )}
            
            {strain.characteristics_biochemical && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Biochemical</p>
                <p className="text-sm text-gray-900">{strain.characteristics_biochemical}</p>
              </div>
            )}
          </div>

          {/* Potentials */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Potentials</p>
            <div className="flex flex-wrap gap-2">
              {strain.potential_nitrogen_fixer && (
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">Nitrogen Fixer</span>
              )}
              {strain.potential_phosphate_solubilizer && (
                <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">Phosphate Solubilizer</span>
              )}
              {strain.potential_proteolytic && (
                <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">Proteolytic</span>
              )}
              {strain.potential_lipolytic && (
                <span className="px-3 py-1 text-sm bg-pink-100 text-pink-800 rounded-full">Lipolytic</span>
              )}
              {strain.potential_amylolytic && (
                <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full">Amylolytic</span>
              )}
              {strain.potential_cellulolytic && (
                <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">Cellulolytic</span>
              )}
              {strain.potential_antimicrobial && (
                <span className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">Antimicrobial</span>
              )}
              {strain.potential_iaa_hormone && (
                <span className="px-3 py-1 text-sm bg-teal-100 text-teal-800 rounded-full">IAA Hormone</span>
              )}
            </div>
          </div>

          {/* Storage */}
          <div className="grid grid-cols-2 gap-4">
            {strain.storage_technique && (
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Technique</p>
                <p className="mt-1 text-sm text-gray-900">{strain.storage_technique}</p>
              </div>
            )}
            {strain.storage_location && (
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Location</p>
                <p className="mt-1 text-sm text-gray-900">{strain.storage_location}</p>
              </div>
            )}
            {strain.culture_stock && (
              <div>
                <p className="text-sm font-medium text-gray-500">Culture Stock</p>
                <p className="mt-1 text-sm text-gray-900">{strain.culture_stock}</p>
              </div>
            )}
          </div>

          {/* System Info */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <p>Created by: {strain.created_by_name || 'Unknown'}</p>
                <p>Created at: {new Date(strain.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p>Updated at: {new Date(strain.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StrainDetailModal;