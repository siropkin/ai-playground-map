import type { Playground } from "@/lib/types";

// Mock data for playgrounds
export const playgrounds: Playground[] = [
  {
    id: 1,
    name: "Central Park Playground",
    address: "Central Park, New York, NY",
    description:
      "A beautiful playground located in the heart of Central Park. Features multiple play areas for different age groups, with modern equipment and safety surfaces throughout.",
    hours: "6:00 AM - 10:00 PM",
    distance: "0.5 miles",
    rating: 4.8,
    reviews: 124,
    ages: ["2-12"],
    features: ["Swings", "Slides", "Sand"],
    access: "Free",
    images: [
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
    ],
    location: {
      lat: 40.7812,
      lng: -73.9665,
    },
  },
  {
    id: 2,
    name: "Riverside Playground",
    address: "Riverside Dr, New York, NY",
    description:
      "A riverside playground with beautiful views and modern equipment. Great for younger children with gentle play structures.",
    hours: "7:00 AM - 8:00 PM",
    distance: "0.8 miles",
    rating: 4.5,
    reviews: 89,
    ages: ["0-5"],
    features: ["Swings", "Slides"],
    access: "Free",
    images: [
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
    ],
    location: {
      lat: 40.8013,
      lng: -73.971,
    },
  },
  {
    id: 3,
    name: "Community Garden Playground",
    address: "Garden St, New York, NY",
    description:
      "A community-maintained playground surrounded by gardens. Offers a natural play environment with sand areas and climbing structures.",
    hours: "8:00 AM - 7:00 PM",
    distance: "1.2 miles",
    rating: 4.2,
    reviews: 56,
    ages: ["4-10"],
    features: ["Slides", "Sand"],
    access: "Community",
    images: [
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
    ],
    location: {
      lat: 40.7648,
      lng: -73.9808,
    },
  },
  {
    id: 4,
    name: "Adventure Playground",
    address: "Adventure Ave, New York, NY",
    description:
      "An adventure-themed playground with challenging climbing structures and exciting slides. Perfect for older children looking for more adventurous play.",
    hours: "9:00 AM - 9:00 PM",
    distance: "1.5 miles",
    rating: 4.9,
    reviews: 210,
    ages: ["5-15"],
    features: ["Swings", "Slides", "Climbing"],
    access: "Paid",
    images: [
      "/placeholders/playground.svg?height=300&width=500",
      "/placeholders/playground.svg?height=300&width=500",
    ],
    location: {
      lat: 40.758,
      lng: -73.9855,
    },
  },
];
