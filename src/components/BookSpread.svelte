<script>
    import BookPage from './BookPage.svelte';

    let {
        spread    = { left: { pageNum: '', elements: [] }, right: { pageNum: '', elements: [] } },
        isCurrent = false,
        direction = null,
        setActive = () => {},
        onUpdate  = () => {},
    } = $props();

    function handleUpdate(side, elements, pageNum) {
        onUpdate({ ...spread, [side]: { ...spread[side], elements, pageNum } });
    }
</script>

<section
    class="book-spread"
    class:is-current={isCurrent}
    class:is-entering-forward={direction === 'entering-forward'}
    class:is-entering-backward={direction === 'entering-backward'}
    class:is-leaving-forward={direction === 'leaving-forward'}
    class:is-leaving-backward={direction === 'leaving-backward'}
>
    <BookPage
        side="left"
        elements={spread.left.elements}
        pageNum={spread.left.pageNum}
        hasBlot={true}
        {setActive}
        onUpdate={(els, pn) => handleUpdate('left', els, pn)}
    />
    <div class="book-gutter" aria-hidden="true"></div>
    <BookPage
        side="right"
        elements={spread.right.elements}
        pageNum={spread.right.pageNum}
        hasBlot={false}
        {setActive}
        onUpdate={(els, pn) => handleUpdate('right', els, pn)}
    />
</section>
