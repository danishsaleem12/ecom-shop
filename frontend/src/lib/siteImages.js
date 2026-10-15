// Images used by site chrome (Navbar mega-menu cards). One place to change them:
// swap any value for your own file, e.g. '/images/nav/new-arrivals.jpg' (put it in public/images/nav/).
const unsplash = (id, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

export const SITE_IMAGES = {
  navCards: {
    newArrivals: unsplash('photo-1578747522731-9e5a179b02f7'),
    summerDresses: unsplash('photo-1595777457583-95e059d581b8'),
    springSummer: unsplash('photo-1595777457583-95e059d581b8'),
    evening: unsplash('photo-1578747522731-9e5a179b02f7'),
  },
};