class GetDesignersUseCase {
    constructor(profileRepository) {
        this.profileRepository = profileRepository;
    }

    async execute() {
        const designers = await this.profileRepository.findDesigners();
        return {
            success: true,
            message: "Diseñadores obtenidos con éxito",
            data: designers
        };
    }
}

export default GetDesignersUseCase;