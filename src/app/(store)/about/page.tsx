import { AboutPage } from '@/components/pages/AboutPage'
import { getAboutPageContent } from '@/lib/website/queries'

export const metadata = {
  title: 'About',
  description: 'Viable — casual footwear for Dhaka’s Gen Z. Size guide & contact.',
}

export default async function About() {
  const content = await getAboutPageContent()
  return <AboutPage content={content} />
}
