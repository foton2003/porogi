import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductCard from './pages/ProductCard'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import NotFound from './pages/NotFound'
import ImportProbe from './pages/ImportProbe'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'import-probe', element: <ImportProbe /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'product/:id', element: <ProductCard /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order/:orderNumber', element: <OrderSuccess /> },
      { path: 'order/:orderNumber/:slug', element: <OrderSuccess /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
