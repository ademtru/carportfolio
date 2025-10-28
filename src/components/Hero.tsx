import React from 'react';

const Hero: React.FC = () => {
    return (
        <section className="hero">
            <div className="hero-content">
                <h1>Welcome to My Bouldering Portfolio</h1>
                <p>Explore my journey in the world of bouldering and climbing through interactive 3D experiences.</p>
                <a href="#projects" className="btn">View Projects</a>
            </div>
        </section>
    );
};

export default Hero;