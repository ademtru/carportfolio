# Bouldering Portfolio

Welcome to the Bouldering Portfolio project! This website showcases a personal portfolio with a unique 3D interactive bouldering theme. The project is built using Next.js and incorporates Three.js for rendering the 3D environment.

## Features

- **3D Bouldering Scene**: Experience an interactive bouldering environment that showcases climbing walls and dynamic elements.
- **Responsive Design**: The portfolio is designed to be fully responsive, ensuring a great experience on all devices.
- **Project Showcase**: Detailed presentation of projects and achievements with interactive elements.
- **Personal Information**: A dedicated section for a brief bio and skills summary.

## Project Structure

The project is organized into several key directories and files:

- **src/pages**: Contains the main pages of the application.
  - `_app.tsx`: Custom App component for initializing pages.
  - `index.tsx`: Main landing page with the 3D bouldering scene.
  - `about.tsx`: Personal information section.
  - `projects.tsx`: Showcase of projects and achievements.

- **src/components**: Contains reusable components.
  - `Header.tsx`: Navigation menu.
  - `Footer.tsx`: Contact information and social media links.
  - `Hero.tsx`: Engaging introduction message.
  - `ProjectCard.tsx`: Individual project details.
  - `BoulderingScene.tsx`: Renders the 3D bouldering environment.

- **src/scenes**: Logic for managing the 3D scene.
  - `BoulderingScene.ts`: Climbing walls and interactive elements.
  - `Lighting.ts`: Lighting setup for the scene.

- **src/models**: Documentation for 3D models used in the project.

- **src/shaders**: Custom shaders for the bouldering scene.

- **src/hooks**: Custom hooks for managing state and behavior.
  - `useCameraControls.ts`: Camera controls for the 3D environment.

- **src/utils**: Utility functions for Three.js operations.

- **src/styles**: CSS styles for the website.

- **public**: Static files like `robots.txt`.

## Installation

To get started with the project, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd bouldering-portfolio
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and visit `http://localhost:3000` to view the portfolio.

## Contributing

Contributions are welcome! If you have suggestions or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.