import React from 'react';
import ProjectCard from '../components/ProjectCard';

const projectsData = [
  {
    title: 'Project One',
    description: 'A detailed description of Project One.',
    technologies: ['React', 'Three.js', 'Node.js'],
    link: 'https://example.com/project-one',
  },
  {
    title: 'Project Two',
    description: 'A detailed description of Project Two.',
    technologies: ['Next.js', 'TypeScript', 'Express'],
    link: 'https://example.com/project-two',
  },
  {
    title: 'Project Three',
    description: 'A detailed description of Project Three.',
    technologies: ['HTML', 'CSS', 'JavaScript'],
    link: 'https://example.com/project-three',
  },
];

const Projects = () => {
  return (
    <div className="projects-container">
      <h1 className="projects-title">My Projects</h1>
      <div className="projects-list">
        {projectsData.map((project, index) => (
          <ProjectCard
            key={index}
            title={project.title}
            description={project.description}
            technologies={project.technologies}
            link={project.link}
          />
        ))}
      </div>
    </div>
  );
};

export default Projects;