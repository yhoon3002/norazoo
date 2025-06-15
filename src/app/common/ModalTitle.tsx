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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{props.currentGame?.name}</h2>
                <button
                    className="text-gray-500 hover:text-gray-900 text-2xl cursor-pointer"
                    onClick={props.handleCloseModal}
                    aria-label="Close"
                >
                    &times;
                </button>
            </div>
        </>
    );
}
