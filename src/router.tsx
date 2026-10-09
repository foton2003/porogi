import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductCard from './pages/ProductCard'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Contacts from './pages/Contacts'
import NotFound from './pages/NotFound'
import ImportProbe from './pages/ImportProbe'
import MarketFeed from './pages/MarketFeed'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'yandex.xml', element: <MarketFeed /> },
      { path: 'import-probe', element: <ImportProbe /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'catalog/*', element: <Catalog /> },
      { path: 'product/:id', element: <ProductCard /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'contacts', element: <Contacts /> },
      { path: 'order/:orderNumber', element: <OrderSuccess /> },
      { path: 'order/:orderNumber/:slug', element: <OrderSuccess /> },
      { path: 'thankyou/:orderNumber', element: <OrderSuccess /> },
      { path: 'thankyou/:orderNumber/:slug', element: <OrderSuccess /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
