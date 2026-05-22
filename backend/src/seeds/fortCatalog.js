/** Canonical fort data — upserted on server start so production DB matches local content. */
module.exports = [
  {
    name: 'Lohagad Fort',
    slug: 'lohgad-fort',
    location: 'Lonavala, Pune district, Maharashtra',
    history:
      'Lohagad Fort is a historic hill fort near Lonavala. Built in the 18th century, it was a strategic Maratha stronghold with impressive gates and the famous Vinchu Kata scorpion-tail ridge.',
    description:
      'A popular weekend trek near Mumbai and Pune with monsoon waterfalls, cloud views, and moderate climb from Malavli.',
    images: [
      'https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg',
      'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg',
      'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg',
    ],
    routes: [
      { type: 'bus', description: 'ST buses to Lonavala, then auto to Malavli base.', duration: '2–3 hrs from Mumbai' },
      { type: 'train', description: 'Mumbai–Pune local to Lonavala or Malavli station.', duration: '1.5 hrs from Mumbai' },
      { type: 'private', description: 'Drive via expressway to Malavli village parking.', duration: '2–3 hrs from Mumbai' },
      { type: 'trek', description: 'Forest trail from Malavli village to the fort top.', duration: '1.5–2 hrs' },
    ],
    facilities: [
      { name: 'Parking', available: true },
      { name: 'Food stalls', available: true },
      { name: 'Restrooms', available: false },
    ],
    stayOptions: [
      {
        name: 'Lonavala resorts',
        description: 'Resorts and hotels in Lonavala for a comfortable stay.',
        pricePerNight: 2500,
        maxGuests: 2,
        availability: true,
      },
    ],
    guides: [
      {
        name: 'Local Lohagad Guide',
        language: ['Marathi', 'Hindi', 'English'],
        pricing: 800,
        rating: 4.5,
        experienceYears: 5,
        contactInfo: 'lohgad.guide@example.com',
        available: true,
      },
    ],
    vehicleRentals: [
      {
        type: 'cab',
        model: 'Sedan/SUV',
        driverName: 'Raj',
        contactInfo: 'raj.cabs@example.com',
        pricePerDay: 2000,
        available: true,
      },
    ],
    mapCoordinates: { lat: 18.6758, lng: 73.4719 },
    bestSeason: 'June–February',
    trekDifficulty: 'Moderate',
    altitude: '3400 ft',
  },
  {
    name: 'Visapur Fort',
    slug: 'visapur-fort',
    location: 'Malavli, Pune district, Maharashtra',
    history:
      'Visapur Fort sits beside Lohagad and was built in the early 18th century. Its wide plateau, caves, and monsoon greenery make it a favourite among trekkers.',
    description:
      'Scenic hill fort with lush surroundings, waterfall routes in monsoon, and panoramic Sahyadri views.',
    images: [
      'https://images.pexels.com/photos/1439222/pexels-photo-1439222.jpeg',
      'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg',
      'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
    ],
    routes: [
      { type: 'bus', description: 'ST buses to Lonavala/Malavli.', duration: '2–3 hrs from Mumbai' },
      { type: 'train', description: 'Local train to Malavli station.', duration: '1.5 hrs from Mumbai' },
      { type: 'private', description: 'Drive to Malavli village.', duration: '2–3 hrs from Mumbai' },
      { type: 'trek', description: 'Trek via Bhaje caves side or Patan village route.', duration: '2 hrs' },
    ],
    facilities: [
      { name: 'Parking', available: true },
      { name: 'Food stalls', available: true },
      { name: 'Restrooms', available: false },
    ],
    stayOptions: [
      {
        name: 'Malavli homestay',
        description: 'Village homestays at the trek base.',
        pricePerNight: 1200,
        maxGuests: 3,
        availability: true,
      },
    ],
    guides: [
      {
        name: 'Local Visapur Guide',
        language: ['Marathi', 'Hindi', 'English'],
        pricing: 1000,
        rating: 4.6,
        experienceYears: 6,
        contactInfo: 'visapur.guide@example.com',
        available: true,
      },
    ],
    vehicleRentals: [
      {
        type: 'cab',
        model: 'SUV',
        driverName: 'Amit',
        contactInfo: 'amit.cab@example.com',
        pricePerDay: 2500,
        available: true,
      },
    ],
    mapCoordinates: { lat: 18.71, lng: 73.4925 },
    bestSeason: 'June–February',
    trekDifficulty: 'Moderate',
    altitude: '3556 ft',
  },
  {
    name: 'Ramshej Fort',
    slug: 'ramshej-fort',
    location: 'Near Nashik, Maharashtra',
    history:
      'Ramshej Fort is associated with Maratha resistance against Mughal forces. The fort offers a rewarding trek with historical bastions and wide views of the Nashik region.',
    description:
      'Less crowded fort trek with rich history, ideal for a day trip from Nashik or Mumbai–Nashik highway travellers.',
    images: [
      'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg',
      'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg',
      'https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg',
      'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
      'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg',
    ],
    routes: [
      { type: 'bus', description: 'Buses to Nashik, then local transport to base village.', duration: '4–5 hrs from Mumbai' },
      { type: 'private', description: 'Drive via NH160 towards Nashik, park at base village.', duration: '3.5–4 hrs from Mumbai' },
      { type: 'trek', description: 'Gradual climb from village trail to fort plateau.', duration: '1.5–2 hrs' },
    ],
    facilities: [
      { name: 'Parking', available: true },
      { name: 'Food stalls', available: false },
      { name: 'Restrooms', available: false },
    ],
    stayOptions: [
      {
        name: 'Nashik city hotels',
        description: 'Stay in Nashik and day-trip to the fort.',
        pricePerNight: 1800,
        maxGuests: 2,
        availability: true,
      },
    ],
    guides: [
      {
        name: 'Ramshej local guide',
        language: ['Marathi', 'Hindi'],
        pricing: 900,
        rating: 4.4,
        experienceYears: 4,
        contactInfo: 'ramshej.guide@example.com',
        available: true,
      },
    ],
    vehicleRentals: [
      {
        type: 'cab',
        model: 'SUV',
        driverName: 'Sanjay',
        contactInfo: 'sanjay.cab@example.com',
        pricePerDay: 2200,
        available: true,
      },
    ],
    mapCoordinates: { lat: 20.012, lng: 73.789 },
    bestSeason: 'October–March',
    trekDifficulty: 'Moderate',
    altitude: '3273 ft',
  },
];
