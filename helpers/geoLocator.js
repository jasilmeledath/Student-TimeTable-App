const geoip = require('geoip-lite');

/**
 * Get location data from IP address
 * @param {string} ip - IP address to lookup
 * @returns {Object|null} Location data or null if not found
 */
exports.getLocationFromIP = (ip) => {
  try {
    // Remove IPv6 prefix if present
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    // Lookup location data
    const geo = geoip.lookup(cleanIP);
    
    if (!geo) return null;

    return {
      ip: cleanIP,
      city: geo.city || 'Unknown',
      country: geo.country || 'Unknown',
      coordinates: {
        latitude: geo.ll ? geo.ll[0] : null,
        longitude: geo.ll ? geo.ll[1] : null
      }
    };
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
};

/**
 * Format location data for display
 * @param {Object} location - Location data object
 * @returns {string} Formatted location string
 */
exports.formatLocation = (location) => {
  if (!location) return 'Location unknown';

  const parts = [];
  
  if (location.city && location.city !== 'Unknown') {
    parts.push(location.city);
  }
  
  if (location.country && location.country !== 'Unknown') {
    parts.push(location.country);
  }

  if (parts.length === 0) {
    return 'Location unknown';
  }

  return parts.join(', ');
};

/**
 * Get coordinates for mapping
 * @param {Object} location - Location data object
 * @returns {Object|null} Coordinates object or null if not available
 */
exports.getCoordinates = (location) => {
  if (!location?.coordinates?.latitude || !location?.coordinates?.longitude) {
    return null;
  }

  return {
    lat: location.coordinates.latitude,
    lng: location.coordinates.longitude
  };
}; 