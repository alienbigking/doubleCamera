import type { RouteConfig } from '@/navigation/types'
import Login from './components/login'

export const loginRoutes: RouteConfig[] = [
  {
    name: 'Login',
    component: Login,
    options: {
      headerShown: false,
    },
  },
]
