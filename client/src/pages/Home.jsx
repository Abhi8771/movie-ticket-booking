import React from 'react'
import HeroSection from '../components/HeroSection'
import FeaturedSection from '../components/FeaturedSection'
import TrailerSection from '../components/TrailerSection'
import ClerkTokenFetcher from '../components/ClerkTokenFetcher'

const Home = () => {
  return (
    <>
      <HeroSection />
      <FeaturedSection/>
      <TrailerSection/>
    </>
  )
}

export default Home