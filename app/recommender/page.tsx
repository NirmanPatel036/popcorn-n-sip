import ProtectedRoute from '@/components/ProtectedRoute'
import NetflixRecommender from '@/components/NetflixRecommender'

export default function RecommenderPage() {
  return (
    <ProtectedRoute>
      <NetflixRecommender />
    </ProtectedRoute>
  )
}