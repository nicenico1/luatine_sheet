<script>
    import BookPage from './BookPage.svelte';

    let {
        spread    = { left: { pageNum: '', elements: [] }, right: { pageNum: '', elements: [] } },
        isCurrent = false,
        direction = null,
        onUpdate  = () => {},
    } = $props();

    function handleUpdate(side, elements) {
        onUpdate({ ...spread, [side]: { ...spread[side], elements } });
    }

    function handlePageNum(side, pageNum) {
        onUpdate({ ...spread, [side]: { ...spread[side], pageNum } });
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
        pageNum={spread.left.pageNum ?? '—'}
        elements={spread.left.elements}
        hasBlot={true}
        onPageNumCommit={(v) => handlePageNum('left', v)}
        onUpdate={(els) => handleUpdate('left', els)}
    />
    <div class="book-gutter" aria-hidden="true"></div>
    <BookPage
        side="right"
        pageNum={spread.right.pageNum ?? '—'}
        elements={spread.right.elements}
        hasBlot={false}
        onPageNumCommit={(v) => handlePageNum('right', v)}
        onUpdate={(els) => handleUpdate('right', els)}
    />
</section>
