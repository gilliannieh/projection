import unsplash from './unsplashClient';

export const getImageUrl = async (query) => {
  try {
    const result = await unsplash.search.getPhotos({
      query,
      page: 1,
      perPage: 1,
      orientation: 'landscape'
    });

    const photo = result.response?.results?.[0];
    return photo?.urls?.regular || null;
  } catch (error) {
    console.error('Error fetching from Unsplash:', error);
    return null;
  }
};

// export const getImageUrl = async (query) => {
//   const fallback = 'diy apartment project';
//   const finalQuery = query || fallback;
//   return `https://source.unsplash.com/800x600/?${encodeURIComponent(finalQuery)}&sig=${Math.floor(Math.random() * 10000)}`;
// };