import React from 'react';

interface ProjectCardProps {
    title: string;
    description: string;
    technologies: string[];
    link: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, description, technologies, link }) => {
    return (
        <div className="project-card">
            <h3 className="project-title">{title}</h3>
            <p className="project-description">{description}</p>
            <div className="project-technologies">
                {technologies.map((tech, index) => (
                    <span key={index} className="technology-badge">{tech}</span>
                ))}
            </div>
            <a href={link} className="project-link" target="_blank" rel="noopener noreferrer">View Project</a>
        </div>
    );
};

export default ProjectCard;