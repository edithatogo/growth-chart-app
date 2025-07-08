import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../DashboardPage'; // Adjust path as necessary

describe('DashboardPage Component', () => {
  it('renders the welcome message', () => {
    render(<DashboardPage />);

    // Check for the main welcome heading
    const headingElement = screen.getByRole('heading', {
      name: /Welcome to the Modern Growth Chart App!/i
    });
    expect(headingElement).toBeInTheDocument();

    // Check for some introductory text
    const introTextElement = screen.getByText(
      /This application allows you to track and visualize pediatric growth data/i
    );
    expect(introTextElement).toBeInTheDocument();
  });

  it('renders feature overview sections', () => {
    render(<DashboardPage />);

    // Check for feature headings (examples)
    expect(screen.getByRole('heading', { name: /Track Patient Growth/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Customizable Centiles/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Multiple Views/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Data-Driven Insights/i })).toBeInTheDocument();
  });

  it('renders the navigation prompt', () => {
    render(<DashboardPage />);
    const navPromptElement = screen.getByText(
      /Use the navigation panel on the left to select a patient/i
    );
    expect(navPromptElement).toBeInTheDocument();
  });
});
