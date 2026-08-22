// ======================================================
// CARRINHO PERSONALIZADO WIX -> WHATSAPP
// ======================================================

// API atual utilizada pelo projeto.
// Mantemos esta API por enquanto para não quebrar
// o funcionamento existente.
import { cart } from 'wix-stores-frontend';


// ======================================================
// CONFIGURAÇÕES
// ======================================================

let carrinho = null;

// Impede vários cliques enquanto o Wix atualiza o carrinho.
let atualizandoCarrinho = false;

// Formato:
// 55 + DDD + número
const NUMERO_DE_WHATSAPP = '';


// ======================================================
// INICIALIZAÇÃO DA PÁGINA
// ======================================================

$w.onReady(function () {

    configurarRepetidor();
    sincronizarCarrinho();

});


// ======================================================
// CONFIGURAÇÃO DO REPETIDOR
// ======================================================

function configurarRepetidor() {

    $w('#repCarrinho').onItemReady(($item, itemData) => {

        // Preenche os elementos visuais.
        preencherItemDoRepetidor(
            $item,
            itemData
        );


        // ==================================================
        // BOTÃO AUMENTAR QUANTIDADE
        // ==================================================

        $item('#btnMaisQuantidade').onClick(async () => {

            if (atualizandoCarrinho) {
                return;
            }

            /*
             * Não utilizamos diretamente:
             *
             * itemData.quantidade
             *
             * porque o itemData recebido pelo onItemReady
             * pode conter a quantidade antiga.
             *
             * Buscamos os dados atuais do repetidor.
             */

            const itemAtual =
                obterItemAtual(itemData._id);


            if (!itemAtual) {

                console.error(
                    'Item atual não encontrado no repetidor.'
                );

                return;
            }


            const quantidadeAtual =
                Number(itemAtual.quantidade || 1);


            const novaQuantidade =
                quantidadeAtual + 1;


            await atualizarQuantidade(
                itemAtual.cartLineItemId,
                novaQuantidade,
                $item
            );

        });


        // ==================================================
        // BOTÃO DIMINUIR QUANTIDADE
        // ==================================================

        $item('#btnMenosQuantidade').onClick(async () => {

            if (atualizandoCarrinho) {
                return;
            }


            const itemAtual =
                obterItemAtual(itemData._id);


            if (!itemAtual) {

                console.error(
                    'Item atual não encontrado no repetidor.'
                );

                return;
            }


            const quantidadeAtual =
                Number(itemAtual.quantidade || 1);


            // Não permite quantidade menor que 1.
            if (quantidadeAtual <= 1) {
                return;
            }


            const novaQuantidade =
                quantidadeAtual - 1;


            await atualizarQuantidade(
                itemAtual.cartLineItemId,
                novaQuantidade,
                $item
            );

        });


        // ==================================================
        // BOTÃO REMOVER PRODUTO
        // ==================================================

        $item('#btnRemoverItemDoCarrinho').onClick(async () => {

            if (atualizandoCarrinho) {
                return;
            }


            const itemAtual =
                obterItemAtual(itemData._id);


            if (!itemAtual) {

                console.error(
                    'Item atual não encontrado no repetidor.'
                );

                return;
            }


            await removerDoCarrinho(
                itemAtual.cartLineItemId,
                $item
            );

        });

    });

}


// ======================================================
// PREENCHE VISUALMENTE UM ITEM DO REPETIDOR
// ======================================================

function preencherItemDoRepetidor(
    $item,
    itemData
) {

    // Imagem
    if (itemData.imagem) {

        $item('#imgImagem').src =
            itemData.imagem;

    }


    // Nome
    $item('#txtProduto').text =
        itemData.nome || '';


    // Preço unitário
    $item('#txtPrecoUnitario').text =
        itemData.precoUnitario ||
        formatarMoeda(0);


    // Total daquele produto
    $item('#txtTotal').text =
        itemData.total ||
        formatarMoeda(0);


    // Quantidade
    $item('#txtQuantidade').text =
        String(itemData.quantidade || 1);


    // Opções / variações
    if (itemData.opcoes) {

        $item('#txtOPcoes').text =
            itemData.opcoes;

        $item('#txtOPcoes').show();

    } else {

        $item('#txtOPcoes').hide();

    }


    // Loader
    $item('#boxAtualizando').hide();

}


// ======================================================
// BUSCA O ESTADO MAIS ATUAL DO ITEM NO REPETIDOR
// ======================================================

function obterItemAtual(id) {

    const dados =
        $w('#repCarrinho').data || [];


    return dados.find(
        (item) => item._id === id
    );

}


// ======================================================
// SINCRONIZA O CARRINHO COM O WIX
// ======================================================

async function sincronizarCarrinho() {

    try {

        const currentCart =
            await cart.getCurrentCart();


        console.log(
            'Carrinho atual:',
            currentCart
        );


        carrinho = currentCart;


        const lineItems =
            currentCart?.lineItems || [];


        // Atualiza produtos
        configurarCarrinhoParaRepetidor(
            lineItems
        );


        // Atualiza botão do WhatsApp
        gerarMensagemWhatsApp(
            lineItems,
            NUMERO_DE_WHATSAPP
        );


        // Atualiza subtotal e total
        modificarTotal();


    } catch (error) {

        console.error(
            'Erro ao buscar o carrinho:',
            error
        );


        carrinho = null;


        configurarCarrinhoParaRepetidor(
            []
        );


        limparResumo();

    }

}


// ======================================================
// TRANSFORMA O CARRINHO EM DADOS DO REPETIDOR
// ======================================================

function configurarCarrinhoParaRepetidor(
    lineItems
) {

    // ==================================================
    // CARRINHO VAZIO
    // ==================================================

    if (
        !Array.isArray(lineItems) ||
        lineItems.length === 0
    ) {

        $w('#boxVazio').expand();

        $w('#btnFinalizarCompra').disable();
        $w('#btnFinalizarCompra').link = '';

        $w('#repCarrinho').data = [];

        return;
    }


    // ==================================================
    // CARRINHO COM PRODUTOS
    // ==================================================

    $w('#boxVazio').collapse();

    $w('#btnFinalizarCompra').enable();


    const data = lineItems.map(
        (item, index) => {

            const quantidade =
                Number(item.quantity || 1);


            const preco =
                Number(item.price || 0);


            const total =
                Number(
                    item.totalPrice ||
                    preco * quantidade
                );


            const opcoes =
                extrairOpcoes(item);


            return {

                // ID obrigatório do Wix Repeater
                _id: String(
                    item.id ||
                    `${item.productId}-${index}`
                ),


                nome:
                    item.name ||
                    'Produto sem nome',


                imagem:
                    item.mediaItem?.src ||
                    item.mediaItem?.url ||
                    '',


                precoUnitario:
                    formatarMoeda(preco),


                total:
                    formatarMoeda(total),


                quantidade:
                    String(quantidade),


                opcoes,


                // ID real da linha do carrinho
                cartLineItemId:
                    item.id,


                sku:
                    item.sku ||
                    'Sem SKU',


                price:
                    preco,


                totalPrice:
                    total,


                weight:
                    Number(
                        item.weight || 0
                    )

            };

        }
    );


    /*
     * Primeiro atualizamos os dados internos
     * do repetidor.
     */
    $w('#repCarrinho').data = data;


    /*
     * IMPORTANTE:
     *
     * Quando o produto continua com o mesmo _id,
     * o Wix pode reutilizar o item visual existente.
     *
     * Por isso atualizamos manualmente os campos
     * de todos os itens já renderizados.
     */
    $w('#repCarrinho').forEachItem(
        ($item, itemData) => {

            /*
             * Procuramos a versão mais recente
             * daquele item no novo array.
             */
            const itemAtualizado =
                data.find(
                    (item) =>
                        item._id === itemData._id
                ) || itemData;


            preencherItemDoRepetidor(
                $item,
                itemAtualizado
            );

        }
    );

}


// ======================================================
// EXTRAI OPÇÕES / VARIAÇÕES
// ======================================================

function extrairOpcoes(item) {

    if (
        !Array.isArray(item.options) ||
        item.options.length === 0
    ) {

        return '';

    }


    return item.options
        .map((opcao) => {

            const nome =
                opcao.option || '';


            const selecao =
                opcao.selection || '';


            if (nome && selecao) {

                return `${nome}: ${selecao}`;

            }


            return selecao;

        })
        .filter(Boolean)
        .join(' | ');

}


// ======================================================
// GERA A MENSAGEM DO WHATSAPP
// ======================================================

function gerarMensagemWhatsApp(
    pedidos,
    numeroWhatsApp
) {

    if (
        !Array.isArray(pedidos) ||
        pedidos.length === 0
    ) {

        $w('#btnFinalizarCompra').link = '';

        return;

    }


    // ==================================================
    // TOTAL DO PEDIDO
    // ==================================================

    const total = pedidos.reduce(
        (sum, item) => {

            const preco =
                Number(item.price || 0);


            const quantidade =
                Number(item.quantity || 1);


            const subtotal =
                Number(
                    item.totalPrice ||
                    preco * quantidade
                );


            return sum + subtotal;

        },
        0
    );


    // ==================================================
    // QUANTIDADE TOTAL DE UNIDADES
    // ==================================================

    const quantidadeTotal =
        pedidos.reduce(
            (sum, item) => {

                return sum +
                    Number(
                        item.quantity || 0
                    );

            },
            0
        );


    // ==================================================
    // PESO TOTAL
    // ==================================================

    const pesoTotal =
        pedidos.reduce(
            (sum, item) => {

                const pesoUnitario =
                    Number(
                        item.weight || 0
                    );


                const quantidade =
                    Number(
                        item.quantity || 1
                    );


                return sum +
                    (
                        pesoUnitario *
                        quantidade
                    );

            },
            0
        );


    // ==================================================
    // FORMATA CADA PRODUTO
    // ==================================================

    const itensFormatados =
        pedidos.map(
            (item, index) => {

                const preco =
                    Number(
                        item.price || 0
                    );


                const quantidade =
                    Number(
                        item.quantity || 1
                    );


                const subtotal =
                    Number(
                        item.totalPrice ||
                        preco * quantidade
                    );


                let texto =
                    `${index + 1}️⃣ *${item.name || 'Produto sem nome'}*\n`;


                // Variações
                const opcoes =
                    extrairOpcoes(item);


                if (opcoes) {

                    texto +=
                        `   • Variação: ${opcoes}\n`;

                }


                // SKU
                texto +=
                    `   • Código: ${item.sku || 'Sem SKU'}\n`;


                // Preço unitário
                texto +=
                    `   • Unitário: ${formatarMoeda(preco)}\n`;


                // Quantidade
                texto +=
                    `   • Quantidade: ${quantidade}\n`;


                // Subtotal
                texto +=
                    `   • Subtotal: ${formatarMoeda(subtotal)}\n`;


                return texto;

            }
        )
        .join('\n');


    // ==================================================
    // MENSAGEM COMPLETA
    // ==================================================

    const mensagem =

        `*NOVO PEDIDO*\n\n` +

        `*TOTAL GERAL: ${formatarMoeda(total)}*\n` +

        `----------------------------------\n\n` +

        `*DETALHES DOS ITENS:*\n\n` +

        itensFormatados +

        `\n----------------------------------\n` +

        `*RESUMO*\n` +

        `• Unidades: ${quantidadeTotal}\n` +

        `• Produtos diferentes: ${pedidos.length}\n` +

        `• Peso total: ${pesoTotal
            .toFixed(1)
            .replace('.', ',')} kg\n\n` +

        `Olá! Gostaria de finalizar este pedido.`;


    // ==================================================
    // LINK
    // ==================================================

    const linkWhatsApp =
        `https://wa.me/${numeroWhatsApp}` +
        `?text=${encodeURIComponent(mensagem)}`;


    $w('#btnFinalizarCompra').link =
        linkWhatsApp;


    $w('#btnFinalizarCompra').target =
        '_blank';

}


// ======================================================
// ATUALIZA SUBTOTAL E TOTAL DO PEDIDO
// ======================================================

function modificarTotal() {

    if (
        !carrinho ||
        !carrinho.totals
    ) {

        limparResumo();

        return;

    }


    const subtotal =
        Number(
            carrinho.totals.subtotal || 0
        );


    const total =
        Number(
            carrinho.totals.total ||
            subtotal
        );


    $w('#txtSubtotal').text =
        formatarMoeda(subtotal);


    $w('#txtTotalPedido').text =
        formatarMoeda(total);

}


// ======================================================
// LIMPA SUBTOTAL E TOTAL
// ======================================================

function limparResumo() {

    $w('#txtSubtotal').text =
        formatarMoeda(0);


    $w('#txtTotalPedido').text =
        formatarMoeda(0);

}


// ======================================================
// ALTERA QUANTIDADE DE UM PRODUTO
// ======================================================

async function atualizarQuantidade(
    cartLineItemId,
    quantidade,
    $item
) {

    if (!cartLineItemId) {

        console.error(
            'ID do item do carrinho não encontrado.'
        );

        return;

    }


    if (quantidade < 1) {
        return;
    }


    if (atualizandoCarrinho) {
        return;
    }


    atualizandoCarrinho = true;


    $item('#boxAtualizando').show();


    try {

        console.log(
            'Atualizando quantidade:',
            {
                cartLineItemId,
                quantidade
            }
        );


        // ==================================================
        // ALTERA NO CARRINHO WIX
        // ==================================================

        await cart.updateLineItemQuantity(
            cartLineItemId,
            quantidade
        );


        /*
         * Atualização visual imediata.
         *
         * Assim o cliente não precisa esperar
         * toda a sincronização do carrinho para
         * enxergar a nova quantidade.
         */
        $item('#txtQuantidade').text =
            String(quantidade);


        /*
         * Depois buscamos novamente o carrinho.
         *
         * Isso atualiza:
         *
         * - quantidade
         * - subtotal do produto
         * - subtotal do carrinho
         * - total geral
         * - mensagem do WhatsApp
         */
        await sincronizarCarrinho();


    } catch (error) {

        console.error(
            'Erro ao atualizar quantidade:',
            error
        );


        /*
         * Caso o Wix rejeite a alteração,
         * sincronizamos novamente para garantir
         * que a interface volte ao valor real.
         */
        await sincronizarCarrinho();


    } finally {

        atualizandoCarrinho = false;


        $item('#boxAtualizando').hide();

    }

}


// ======================================================
// REMOVE UM PRODUTO
// ======================================================

async function removerDoCarrinho(
    cartLineItemId,
    $item
) {

    if (!cartLineItemId) {

        console.error(
            'ID do item do carrinho não encontrado.'
        );

        return;

    }


    if (atualizandoCarrinho) {
        return;
    }


    atualizandoCarrinho = true;


    $item('#boxAtualizando').show();


    try {

        console.log(
            'Removendo item:',
            cartLineItemId
        );


        await cart.removeProduct(
            cartLineItemId
        );


        await sincronizarCarrinho();


    } catch (error) {

        console.error(
            'Erro ao remover item:',
            error
        );


        await sincronizarCarrinho();


    } finally {

        atualizandoCarrinho = false;


        /*
         * Se o produto tiver sido removido,
         * aquele item do repetidor pode já
         * não existir mais.
         *
         * Por isso protegemos esta operação.
         */
        try {

            $item('#boxAtualizando').hide();

        } catch (error) {

            // Item já removido da interface.
        }

    }

}


// ======================================================
// FORMATA VALOR PARA REAL
// ======================================================

function formatarMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            'pt-BR',
            {
                style: 'currency',
                currency: 'BRL'
            }
        );

}