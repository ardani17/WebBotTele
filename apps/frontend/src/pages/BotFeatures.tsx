import React, { useState, useEffect } from 'react';

interface BotFeature {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  commands: string[];
  userCount: number;
}

const BotFeatures: React.FC = () => {
  const [features, setFeatures] = useState<BotFeature[]>([
    {
      id: 'location',
      name: 'Location Mode',
      description: 'Fitur untuk tracking lokasi, mengukur jarak, dan reverse geocoding',
      isActive: true,
      commands: ['/lokasi', '/alamat', '/koordinat', '/ukur', '/ukur_motor', '/ukur_mobil'],
      userCount: 45
    },
    {
      id: 'workbook',
      name: 'Workbook Mode', 
      description: 'Fitur untuk membuat workbook Excel dengan foto-foto',
      isActive: true,
      commands: ['/workbook', 'sheet1', 'send', 'cek', 'clear'],
      userCount: 32
    },
    {
      id: 'ocr',
      name: 'OCR Mode',
      description: 'Optical Character Recognition untuk ekstrak teks dari gambar',
      isActive: false,
      commands: ['/ocr'],
      userCount: 0
    },
    {
      id: 'archive',
      name: 'Archive Mode',
      description: 'Fitur untuk mengarsipkan dan mengelola file',
      isActive: false,
      commands: ['/archive'],
      userCount: 0
    },
    {
      id: 'geotags',
      name: 'Geotags Mode',
      description: 'Ekstrak dan analisis metadata geolokasi dari foto',
      isActive: false,
      commands: ['/geotags'],
      userCount: 0
    },
    {
      id: 'kml',
      name: 'KML Mode',
      description: 'Generate dan parse file KML untuk mapping',
      isActive: false,
      commands: ['/kml'],
      userCount: 0
    }
  ]);

  const toggleFeature = (featureId: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, isActive: !feature.isActive }
        : feature
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bot Features</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Add New Feature
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div key={feature.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{feature.name}</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={feature.isActive}
                  onChange={() => toggleFeature(feature.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  feature.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {feature.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{feature.description}</p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Commands:</h4>
              <div className="flex flex-wrap gap-1">
                {feature.commands.map((command, index) => (
                  <span 
                    key={index}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono"
                  >
                    {command}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{feature.userCount} active users</span>
              <button className="text-blue-600 hover:text-blue-800">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">6</div>
            <div className="text-sm text-gray-500">Total Features</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">2</div>
            <div className="text-sm text-gray-500">Active Features</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">77</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">1,234</div>
            <div className="text-sm text-gray-500">Commands Used</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotFeatures;
