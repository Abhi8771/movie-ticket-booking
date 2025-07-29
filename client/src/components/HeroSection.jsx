import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, Calendar1Icon, Clock1Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    title: 'Jurassic Park: Rebirth',
    genres: 'Action | Sci-Fi | Thriller',
    year: '2025',
    duration: '2h 10m',
    description: 'Dinosaurs are brought back once again, but this time they’ve evolved beyond control. A new generation must survive the rebirth.',
    image: '/background1.jpg', // Replace with actual Jurassic Park background
    logo: assets.marvelLogo // Replace with correct logo if available
  },
  {
    title: 'Until Dawn',
    genres: 'Horror | Mystery | Drama',
    year: '2023',
    duration: '1h 50m',
    description: 'Trapped on a remote mountain, a group of friends must survive until dawn as they’re hunted by something terrifying.',
    image: '/background2.jpg', // Replace with Until Dawn-style background
    logo: assets.marvelLogo // Replace with appropriate logo if available
  },
  {
    title: 'The Accountant 2',
    genres: 'Crime | Thriller | Action',
    year: '2024',
    duration: '2h 5m',
    description: 'Christian Wolff returns for another high-stakes mission involving corporate corruption, global money trails, and a deadly conspiracy.',
    image: '/background3.jpg', // Replace with Accountant 2-style background
    logo: assets.marvelLogo // Replace with proper logo
  }
]


const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const slide = slides[currentSlide]

  return (
    <div
      className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen transition-all duration-1000 ease-in-out'
      style={{ backgroundImage: `url(${slide.image})` }}
    >
      <img src={slide.logo} alt="logo" className='max-h-11 lg:h-11 mt-20' />

      <h1 className='text-5xl md:text-[70px] md:leading-[4.5rem] font-semibold max-w-3xl'>
        {slide.title}
      </h1>

      <div className='flex items-center gap-4 text-gray-300'>
        <span>{slide.genres}</span>
        <div className='flex items-center gap-1'>
          <Calendar1Icon className='w-4 h-4' />{slide.year}
        </div>
        <div className='flex items-center gap-1'>
          <Clock1Icon className='w-4 h-4' />{slide.duration}
        </div>
      </div>

      <p className='max-w-md text-gray-300'>{slide.description}</p>

      <button
        onClick={() => navigate('/movies')}
        className='flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
        aria-label='Explore Movies'
      >
        Explore Movies
        <ArrowRight className='w-5 h-5' />
      </button>
    </div>
  )
}

export default HeroSection
