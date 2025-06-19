type Game = {
    name: string;
    desc: string;
};

type ModalTitleProps = {
    currentGame: Game | null;
    handleCloseModal: () => void;
};

export default function ModalTitle(props: ModalTitleProps) {
    return (
        <>
            <div className="flex flex-none justify-between items-center mb-4">
                <h2 className="text-lg sm:text-lg md:text-xl lg:text-xl xl:text-2xl 2xl:text-2xl font-bold">
                    {props.currentGame?.name}
                </h2>
                <button
                    aria-label="Close"
                    className="text-gray-500 hover:text-gray-900 text-3xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-4xl 2xl:text-5xl cursor-pointer"
                    onClick={props.handleCloseModal}
                >
                    &times;
                </button>
            </div>
        </>
    );
}
