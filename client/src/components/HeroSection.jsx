import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, Calendar1Icon, Clock1Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './HeroSection.css';

const slides = [
  {
    title: 'Jurassic Park: Rebirth',
    genres: 'Action | Sci-Fi | Thriller',
    year: '2025',
    duration: '2h 10m',
    description: 'Dinosaurs are brought back once again, but this time they’ve evolved beyond control. A new generation must survive the rebirth.',
    image: '/background1.jpg', 
    logo: assets.marvelLogo 
  },
  {
  title: 'Avatar: Fire and Ash',
  genres: 'Action | Adventure | Sci-Fi',
  year: '2025',
  duration: '3h 5m',
  description: 'As Pandora faces a scorched invasion, Jake Sully and Neytiri must unite rival clans and confront an ancient force buried beneath the ash to protect their world from extinction.',
  image: '/avatar1.jpg', // Replace with imported image if you prefer
  logo: assets.avatarlogo
  },
  {
  title: 'Ballerina',
  genres: 'Action | Crime | Thriller',
  year: '2025',
  duration: '2h 5m',
  description: 'Eve Macarro, a ballerina-turned-assassin trained within the Ruska Roma, embarks on a high-stakes mission to avenge her father\'s murder. Positioned between the events of John Wick: Chapter 3 – Parabellum and Chapter 4, the film blends stylized ultraviolence, dark underworld mythology, and inventive action sequences.',
  image: '/ballerina.jpg',
  logo: assets.ballerina
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

      
<div className="rainbow relative z-0 overflow-hidden p-0.5 flex items-center justify-center rounded-full hover:scale-105 transition duration-300 active:scale-100">
  <button
        onClick={() => navigate('/movies')}
        className='flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
        aria-label='Explore Movies'
      >
        Explore Movies
        <ArrowRight className='w-5 h-5' />
      </button>
</div>
    </div>
  )
}

export default HeroSection
